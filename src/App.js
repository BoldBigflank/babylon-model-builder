import React from 'react';
import ModelBuilder from './components/ModelBuilder'
import MapBuilder from './components/MapBuilder'
import './App.css';
import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";

function App() {
  return (
    <Router>
      <div>
        <Switch>
          <Route exact path="/">
            <ModelBuilder />
          </Route>
          <Route path="/model">
            <ModelBuilder />
          </Route>
          <Route path="/map">
            <MapBuilder />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

export default App;
