const server = require("express")()
const jsonParser = require("body-parser").json()
const bcrypt = require("bcrypt")
const busboy = require("connect-busboy")()
const sharp = require("sharp")
const path = require("path")
const fs = require("fs")
const { v4: uuidv4 } = require("uuid")

const saltRounds = 10

const privileged = require("../middleware/privileged")
const authenticated = require("../middleware/authenticated")()

const { Admin } = require("../../models/index")

const mediaDir = process.env.mediaDir
const baseTempDir = path.join(mediaDir, "/temp")
const baseUsersDir = path.join(mediaDir, "/users")

server.post("/admin/users/update", authenticated, privileged(1), busboy, async (req, res) => {
  req.pipe(req.busboy)

  const dirUUID = uuidv4() // Regenerates a new UUID each call, so call once to store one UUID
  const tmpDir = path.join(baseTempDir, dirUUID)
  const minifiedDir = path.join(tmpDir, "minified")
  const response = { code: undefined }
  let oldUserData
  let userData
  let userFile = undefined
  let userDir = uuidv4()

  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)

  req.busboy.on("field", (fieldname, val) => {
    userData = JSON.parse(val)
  })

  req.busboy.on("file", async (fieldname, file, fileName) => {
    const extension = fileName.split(".").slice(-1)[0]
    const newFileName = uuidv4() + "." + extension

    const fstream = fs.createWriteStream(path.join(tmpDir, newFileName))

    userFile = newFileName

    file.pipe(fstream)
    return
  })

  const checkUserExists = () => {
    return Admin.findOne({ email: userData.email }, (err, data) => {
      if (err) response.code = 500
      else if (Object.keys(data).length) {
        oldUserData = data
        response.code = 200
      } else response.code = 404
      return
    })
  }

  const minifyFiles = async () => {
    fs.mkdirSync(minifiedDir)

    await (async function minify() {
      const fileLocation = path.join(tmpDir, userFile)
      const minifiedFile = path.join(minifiedDir, userFile)
      await sharp(fileLocation).resize(null, 800).toFile(minifiedFile)
      return
    })()

    return
  }

  const hashPassword = async () => {
    if (!userData.password) return
    return new Promise((resolve, reject) => {
      bcrypt.genSalt(saltRounds, async (err, salt) => {
        if (err) {
          response.code = 500
          reject(err)
        } else {
          bcrypt.hash(userData.password, salt, (err, hash) => {
            if (err) {
              response.code = 500
              reject(err)
            } else {
              userData.password = hash
              resolve()
            }
          })
        }
      })
    })
  }

  const saveUser = async () =>
    new Promise((resolve, reject) => {
      Admin.findById(userData._id, (err, data) => {
        if (userFile) {
          console.log(oldUserData)
          if (oldUserData.fileName && oldUserData.fileName !== "placeholder.png") fs.unlinkSync(path.join(baseUsersDir, oldUserData.filename))
          fs.renameSync(path.join(minifiedDir, userFile), path.join(baseUsersDir, userFile))
          userData.filename = userFile
        }

        Object.assign(data, userData)

        data.save().then(resolve())
      })
    })

  const deleteTmpFiles = async () =>
    fs.rmdirSync(tmpDir, {
      recursive: true // Will not work below Node ~= v14
    })

  const cleanUpAfterError = () =>
    new Promise(async (resolve, reject) => {
      if (fs.existsSync(tmpDir)) await deleteTmpFiles()
      if (fs.existsSync(userDir)) fs.rmdirSync(userDir, { recursive: true })
      await Admin.findOneAndDelete({ email: userData.email }) // We create a fake ID on client side, which does not reflect real ID
        .then(resolve())
        .catch(err => {
          console.log(err)
          reject(err)
        })
    })

  req.busboy.on("finish", async () => {
    try {
      await checkUserExists()
      if (response.code !== 200) await deleteTmpFiles()
      else {
        if (userFile) await minifyFiles()
        await hashPassword()
        await saveUser()
        await deleteTmpFiles()
      }
      if (response.code === 500) await cleanUpAfterError() // Delete our work if we created it, but could not complete it - 500 is only used for issues completing work
      res.sendStatus(response.code)
    } catch (error) {
      console.log(error)
      res.sendStatus(500)
    }
  })
})

module.exports = server
