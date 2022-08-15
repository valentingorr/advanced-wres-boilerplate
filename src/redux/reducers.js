import {
	combineReducers
} from "redux";

export default combineReducers({
	theme: (state = "dark", action) => {
		switch(action.type) {
			default: case "dark":
				return "dark";
				break;
			case "light":
				return "light";
				break;
		}
	}
});