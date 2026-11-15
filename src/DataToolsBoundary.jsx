import React from 'react';
export class DataToolsBoundary extends React.Component{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<section className="forecast-paused" role="alert"><h3>Data tools could not open.</h3><p>Please try again. Your saved farms are still available in My farms.</p><button className="secondary" onClick={()=>this.setState({failed:false})}>Try again</button></section>:this.props.children;}
}
