import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import reportWebVitals from "./reportWebVitals";
import Amplify from "aws-amplify";
import config from "./aws-exports";
import { Authenticator } from "@aws-amplify/ui-react";

import AppNavigation from "./AppNavigation";

Amplify.configure(config);

/**
 * Render the site
 * Wrap it in the Authenticator to enable authentication
 * Use the AppNavigation component to navigate between the
 * authentication page and blog home page.
 */
ReactDOM.render(
  <React.StrictMode>
    <Authenticator.Provider>
      <AppNavigation />
    </Authenticator.Provider>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
