/**
 * Created by Vashnak on 28/06/17.
 */

import React from 'react';
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
import Loader from './components/loader/Loader';


import ClustersService from './services/ClustersService';

class App extends React.Component {
  constructor(props) {
    super(props);

    const baseUrl = document.querySelector('base').attributes['href'].value;
    this.state = {
      baseUrl,
      loaded: false,
      cluster: null,
      error: null
    };
  }

  componentDidMount() {
    ClustersService.getSelectedCluster().then(cluster => {
      this.setState({
        loaded: true,
        cluster: cluster
      });
    }).catch(err => {
      console.error(err);
      this.setState({
        error: err
      });
    });
  }

  render() {
    let content = null;

    if(this.state.error) {
      content = ""+this.state.error;
    } else if(!this.state.loaded) {
      content = (<Loader/>);
    } else if(!this.state.cluster) {
      // TODO: temporary
      content = "Cluster not found.";
    } else {
      content = (
        <Switch>
          {/*<Route exact path="/" render={() => <Redirect to="/dashboard"/>}/>
             <Route exact path="/dashboard" component={DashboardView}/> */}
          <Route exact path="/" render={() => <Redirect to="/topics"/>}/>
          <Route exact path="/dashboard" render={() => <Redirect to="/topics"/>}/>
          
          <Route exact path="/cluster" component={ClusterView}/>
          <Route exact path="/topics" component={TopicsView}/>
          <Route exact path="/topics/:topicId" component={TopicView}/>
          <Route exact path="/consumers" component={ConsumersView}/>
          <Route exact path="/consumers/:consumerId" component={ConsumerView}/>
        </Switch>
      );
    }
    
    return (
      <BrowserRouter basename={this.state.baseUrl}>
        <div className="document-wrapper">
          <Topnav/>
          <div className="page-wrapper">
            <Sidenav/>
            <div className="content-wrapper">
              { content }
            </div>
          </div>
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
