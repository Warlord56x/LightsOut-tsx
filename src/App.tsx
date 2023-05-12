import React from 'react';
import './App.css';
import LightsOut from "./LightsOut";
import LightsOutGamePhaser from "./PhaserLightsOut";

const App: React.FC = () => {
    return (
        <div className="App">
            <LightsOutGamePhaser/>
        </div>
    );
};

export default App;
