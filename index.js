require("dotenv").config();
const PORT = process.env.PORT || 3000;

const path = require("path");

const webpack = require("webpack");
const webpackMiddleware = require("webpack-dev-middleware");
const express = require("express");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "./public/"));
app.use(express.static(path.resolve(__dirname, "./public/assets/")));

const session = require("express-session");
app.use(session({
	cookieName: "secret",
	secret: "1m4Qio5OPd8cMJBEWTKylTaJUZ8hzFv3",
	resave: false,
	saveUninitialized: true,
	httpOnly: true,
	secure: true,
	ephemeral: true,
	expires: new Date(Date.now() + (60 * 60 * 1000)),
	cookie: {
		maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

const config = require("./webpack.config.js");
const compiler = webpack(config);
const middleware = webpackMiddleware(compiler, {
	publicPath: config.output.publicPath,
	logLevel: "warn",
	silent: true,
	stats: "errors-only"
});

app.use(middleware);

const http = require("http").createServer(app);
http.listen(PORT, console.log(`server listening on port ${PORT}`));

const io = require("./modules/io.js")(http);
const users = require("./modules/users.js");

io.use((socket, next) => {
	const user = users().users.find(user => user.data.token === socket.handshake.auth.token);
	user.update({ socket: socket.id });
	user.updateSession();
	socket.user = user;
	next();
});

io.on("connection", socket => {
});

const api = [
	"/socket.io"
];

app.use((req, res, next) => {
	const user = users().users.find(user => user.data.session === req.sessionID) || users().insert({ session: req.sessionID });
	user.updateSession();
	req.user = user;
	if(!api.find(route => req.url.match(new RegExp(`^${route}`, "g")))) res.render("index", {
		token: user.data.token
	});
	next();
});