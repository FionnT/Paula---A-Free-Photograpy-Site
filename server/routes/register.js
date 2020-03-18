const server = require("express")()
const jsonParser = require("body-parser").json()
const bcrypt = require("bcrypt")
const saltRounds = 10

const privileged = require("./middleware/privileged")
const authenticated = require("./middleware/authenticated")()
const { Admin, Person } = require("../models/index")

// authenticated, privileged(2),
server.post("/admin/register", jsonParser, async (req, res) => {
  const { email, password } = req.body
  await Admin.findOne({ email }, (err, result) => {
    if (err) res.sendStatus(502)
    else if (result) res.sendStatus(403)
    else {
      bcrypt.genSalt(saltRounds, (err, salt) => {
        if (err) res.sendStatus(502)
        else {
          bcrypt.hash(password, salt, (err, hash) => {
            if (err) res.sendStatus(502)
            else {
              req.body.password = hash
              let uAdmin = new Admin(req.body)
              uAdmin
                .save()
                .then(res.sendStatus(200))
                .catch(err => {
                  console.log(err)
                  res.sendStatus(502)
                })
            }
          })
        }
      })
    }
  })
})

server.post("/shop/register", jsonParser, async (req, res) => {
  const { email, password } = req.body
  await Person.findOne({ email }, (err, result) => {
    if (err) res.sendStatus(502)
    else if (result) res.sendStatus(403)
    else {
      bcrypt.genSalt(saltRounds, (err, salt) => {
        if (err) res.sendStatus(502)
        else {
          bcrypt.hash(password, salt, (err, hash) => {
            if (err) res.sendStatus(502)
            else {
              req.body.password = hash
              let uAdmin = new Person(req.body)
              uAdmin
                .save()
                .then(res.sendStatus(200))
                .catch(err => {
                  console.log(err)
                  res.sendStatus(502)
                })
            }
          })
        }
      })
    }
  })
})

module.exports = server