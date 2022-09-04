import React, {
	useEffect
} from "react";

import $ from "jquery";
import gsap from "gsap";

export default props => {

	useEffect(() => {
		$(window).mousemove(event => {
			[
				document.querySelector("#pointer .circular")
			].forEach(node => {
				console.log(node)
				node.style.left = `${event.clientX}px`;
				node.style.top = `${event.clientY}px`;
			});
		});
	}, []);

	return (
		<div id="pointer">
			<div className="circular"></div>
		</div>
	);
};