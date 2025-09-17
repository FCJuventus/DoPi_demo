import React, { CSSProperties } from "react";
import { User } from "../";

interface Props {
  onSignIn: () => void;
  onSignOut: () => void;
  user: User | null
}

const headerStyle: CSSProperties = {
  padding: 8,
  backgroundColor: "gray",
  color: "white",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

export default function Header(props: Props) {
  return (
    <header style={headerStyle}>
      <div style={{ fontWeight: "bold" }}>DoPi</div><nav style={{marginLeft: 16}}><a href="/privacy.html" style={{color:"white",marginRight:12}}>Privacy</a><a href="/terms.html" style={{color:"white"}}>Terms</a></nav>

      <div>
        {props.user === null ? (
          <button onClick={props.onSignIn}>Sign in</button>
        ) : (
          <div>
            @{props.user.username} <button type="button" onClick={props.onSignOut}>Sign out</button>
          </div>
        )}
      </div>
    </header>
  );
}
