import { Amplify } from "aws-amplify";
import React /*, { Component } */ from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import "@aws-amplify/ui-react/styles.css";

import awsExports from "./aws-exports";
import Home from "./Home";
import Login from "./Login";

Amplify.configure(awsExports);

/**
 * Set the navigation between / (blog homepage) and
 * Login (for authentication).
 */
const AppNavigation = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="Login" element={<Login />} />
    </Routes>
  </Router>
);

export default AppNavigation;
