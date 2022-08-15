import React, {
	createContext
} from "react";

export const user = createContext();
export const style = createContext();
export const socket = createContext();
export default props => {
	return (
		<user.Provider value={props.user}>
		<style.Provider value={props.STYLE}>
		<socket.Provider value={props.socket}>
			{props.children}
		</socket.Provider>
		</style.Provider>
		</user.Provider>
	);
};