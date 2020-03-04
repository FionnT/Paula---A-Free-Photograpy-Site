import React from "react"
import "./styles.sass"

export default function Button(props) {
  const onClick = props.onClick?.bind(this)
  return (
    <button onClick={onClick} class={props?.className}>
      {props.children}
    </button>
  )
}
