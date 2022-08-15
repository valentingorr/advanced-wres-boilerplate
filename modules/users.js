const { v4: uuid } = require("uuid");

const sessionTimeout = (10 * 60 * 1000); // 10min

class User {
	constructor(parameters, onTimeout) {
		this.data = { token: uuid() };
		Object.keys(parameters).forEach(key => this.data[key] = parameters[key] );
		this.onTimeout = onTimeout;
		this.timeout = setTimeout(() => this.onTimeout(this), sessionTimeout);
	}
	update(parameters) {
		Object.keys(parameters).forEach(key => this.data[key] = parameters[key] );
	}
	updateSession() {
		clearTimeout(this.timeout);
		this.timeout = setTimeout(() => this.onTimeout(this), sessionTimeout);
	}
}

const manager = new class {
	constructor() {
		this.users = [];
		this.io = require("./io.js")();
	}
	insert(parameters) {
		const user = new User(parameters, user => {
			if(user.data.hasOwnProperty("socket")) this.io.to(user.data.socket).emit("expired-session");
			this.users.splice(this.users.indexOf(this.users.find(user => user.data.token === user.data.token)), 1);
		});
		this.users.push(user);
		return user;
	}
	user(parameters) {
		const user = this.users.find(user => Object.keys(parameters).map(key => {
			if(!(key in user)) return null;
			if(user[key] === parameters[key]) return true;
			return false;
		}).filter(key => key !== null).reduce((current, accumulator) => current && accumulator));
		if(!user) {
			if(parameters.hasOwnProperty("session")) return this.insert(parameters);
			return false;
		}
		return user;
	}
	update(userParameters, parameters) {
		const user = this.user(userParameters);
		if(user) user.update(parameters);
	}
};

module.exports = () => manager;