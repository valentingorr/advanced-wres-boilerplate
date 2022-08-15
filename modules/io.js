let io = undefined;

module.exports = http => {
	if(!io) io = require("socket.io")(http);
	if(!io && !http) return false;
	return io;
};