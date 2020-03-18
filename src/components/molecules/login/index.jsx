import React, { Component } from "react"

import { Input, Button } from "../../atoms"
import "./styles.sass"

class Login extends Component {
  constructor(props) {
    super(props)
    this.textChange = this.props.textController.bind(this)
    this.onSubmit = this.props.onSubmit.bind(this)
  }
  render() {
    return (
      <div id="login">
        <Input type="email" textController={this.textChange} placeholder="Your email" />
        <Input type="password" textController={this.textChange} placeholder="Your password" />
        <Button className="center" onSubmit={this.onSubmit}>
          Login
        </Button>
      </div>
    )
  }
}

export default Login