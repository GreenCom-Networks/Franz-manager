/**
 * Created by Vashnak on 28/06/17.
 */

import React from 'react';
import { hot } from 'react-hot-loader/root';
import {
  BrowserRouter, Switch, Route, Redirect,
} from 'react-router-dom';

import Sidenav from './components/sidenav/Sidenav';
import DashboardView from './views/dashboard/Dashboard';
import ClusterView from './views/clusters/Clusters';
import TopicsView from './views/topics/Topics';
import TopicView from './views/topics/topic/Topic';
import ConsumersView from './views/consumers/Consumers';
import ConsumerView from './views/consumers/consumer/Consumer';
import Topnav from './components/topnav/Topnav';


const routes = () => {
  const baseUrl = document.querySelectorAll('base')[0].attributes['href'].value;
  return <BrowserRouter basename={baseUrl}>
    <div className="document-wrapper">
      <Topnav/>
      <div className="page-wrapper">
        <Sidenav/>
        <div className="content-wrapper">
          <Switch>
            <Route
              exact
              path="/"
              render={() => <Redirect to="/dashboard"/>}
            />
            <Route exact path="/dashboard" component={DashboardView}/>
            <Route exact path="/cluster" component={ClusterView}/>
            <Route exact path="/topics" component={TopicsView}/>
            <Route exact path="/topics/:topicId" component={TopicView}/>
            <Route exact path="/consumers" component={ConsumersView}/>
            <Route exact path="/consumers/:consumerId" component={ConsumerView}/>
          </Switch>
        </div>
      </div>
    </div>
  </BrowserRouter>;
};

export default hot(routes);
