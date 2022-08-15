import React, {
	useState,
	useEffect
} from "react";
import ReactDOM from "react-dom";

import {
	BrowserRouter,
	Routes,
	Route
} from "react-router-dom";

import * as CONTEXT from "./context/index.jsx";
import { createStore } from "redux";
import {
	Provider,
	useSelector,
	useDispatch
} from "react-redux";

import reducers from "./redux/reducers.js";
import * as ACTIONS from "./redux/actions.js";

import { io } from "socket.io-client";
const socket = io({
	auth: {
		token: sessionToken
	}
});

import * as STYLE from "./style/_config.scss";
import "./style/style.scss";

//importing routes
import Home from "./routes/Home.jsx";

const store = createStore(reducers, window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__());

const App = () => {

	const [user, setUSer] = useState({
		connected: false
	});

	const theme = useSelector(state => state.theme);

	useEffect(() => {
		socket.on("expired-session", () => alert("user session expired"))
	}, []);

	return (
		<CONTEXT.default {...{user, STYLE, socket}} >
			<Routes>
				<Route exact path="/" element={<Home />} />
			</Routes>
		</CONTEXT.default>
	);
};

export default App;

ReactDOM.render(
	<Provider store={store}>
		<BrowserRouter>
			<App />
		</BrowserRouter>
	</Provider>
, document.getElementById("root"));