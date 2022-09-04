import React, {
	useState,
	useRef,
	useEffect
} from "react";

import "../style/home.scss";

import * as THREE from "three";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";

import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BoxHelper } from "three/src/helpers/BoxHelper.js";

import gsap, {
	Linear
} from "gsap";
import $ from "jquery";

const p2d = n => n * (((Math.PI / 2) / 9) / 10);

export default props => {

	const [currentSlide, setCurrentSlide] = useState(undefined);

	let camera;
	const moveElement = (element, position, rotation, duration = .5) => {
		const currentPosition = {...new THREE.Vector3().copy(element.position)};
		const tl = gsap.timeline({ paused: true });
		tl.to(currentPosition, {
			...position,
			duration: duration,
			ease: Linear.easeNone
		});
		tl.eventCallback("onUpdate", () => {
			Object.keys(currentPosition).forEach(key => {
				element.position[key] = currentPosition[key];
			});
		});
		return tl;
	};

	const slides = [
		{
			component: props => {
				return (
					<>
						<h1>Valentin Gorrin</h1>
						<p>Computer engineer</p>
					</>
				);
			}
		}
	];

	const sceneRef = useRef();

	const Slide = slideProps => {
		return (
			<div slide={slideProps.slide} className={`slide${currentSlide === slideProps.slide ? " s-active" : ""}`}>
				{slideProps.children}
			</div>
		);
	};

	//3d scene
	useEffect(() => {
		const container = sceneRef.current;
		let [containerWidth, containerHeight] = [container.offsetWidth, container.offsetHeight];
		const ENTIRE_SCENE = 0, BLOOM_SCENE = 1;
		const bloomLayer = new THREE.Layers();
		bloomLayer.set(BLOOM_SCENE);

		const renderer = new THREE.WebGLRenderer({ antialias: false });
		renderer.toneMappingExposure = Math.pow(.75, 4.0)
		const scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(50, containerWidth / containerHeight, 1, 1000);
		camera.position.set(0, 5, -5);

		const fxaaPass = new ShaderPass(FXAAShader);
		const copyPass = new ShaderPass(CopyShader);

		const bloomParameters = {
			exposure: .7,
			bloomStrength: 2,
			// bloomStrength: 0,
			bloomThreshold:0,
			bloomRadius: 1,
		};

		const renderScene = new RenderPass(scene, camera);
		const bloomPass = new UnrealBloomPass(new THREE.Vector2(containerWidth, containerHeight), 1.5, 0.4, 0.85);
		bloomPass.threshold = bloomParameters.bloomThreshold;
		bloomPass.strength = bloomParameters.bloomStrength;
		bloomPass.radius = bloomParameters.bloomRadius;

		const bloomComposer = new EffectComposer(renderer);
		bloomComposer.renderToScreen = false;
		bloomComposer.addPass(renderScene);
		bloomComposer.addPass(bloomPass);

		const finalPass = new ShaderPass(
			new THREE.ShaderMaterial({
				uniforms: {
					baseTexture: { value: null },
					bloomTexture: { value: bloomComposer.renderTarget2.texture }
				},
				vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
				fragmentShader: "uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv; void main() { gl_FragColor = (texture2D(baseTexture, vUv) + vec4(1.0) * texture2D(bloomTexture, vUv)); }",
				defines: {}
			}), "baseTexture"
		);
		finalPass.needsSwap = true;

		const finalComposer = new EffectComposer(renderer);
		finalComposer.addPass(renderScene);
		finalComposer.addPass(finalPass);

		const setSize = () => {
			[containerWidth, containerHeight] = [container.offsetWidth, container.offsetHeight];
			camera.aspect = containerWidth / containerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(containerWidth, containerHeight);
			bloomComposer.setSize(containerWidth, containerHeight);
			finalComposer.setSize(containerWidth, containerHeight);

			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(containerWidth, containerHeight);
			renderer.toneMapping = THREE.ReinhardToneMapping;
		};

		setSize();
		window.onresize = setSize;

		//dev
		const controls = new OrbitControls(camera, renderer.domElement);
		//-------------------

		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();

		sceneRef.current.addEventListener("mousemove", event => {
			event.preventDefault();
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
		});

		const darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });
		const materials = {};

		let deskMesh;
		const drawer = {
			group: [],
			opened: false,
			locked: true
		}
		const rgbMeshes = [];
		let interactivesMeshes = [];
		const interactiveChildren = [];

		const combinations = [
			{
				combination: "a",
				// combination: "valentin",
				exec: () => {
					if(drawer.opened) return;
					drawer.group.forEach(mesh => {
						moveElement(mesh, new THREE.Vector3().copy(mesh.position).add(new THREE.Vector3(0, 0, -45), new THREE.Vector3().copy(mesh.rotation))).play();
					});
					drawer.opened = true;
					drawer.locked = false;
				}
			}
		];

		let keysCombination = "";
		const pushCombinaison = key => {
			keysCombination += key;
			const combination = combinations.find(c => new RegExp(`${c.combination}$`, "g").test(keysCombination));
			if(!combination) return;
			combination.exec();
		};

		(async () => {

			const varinoFont = await new Promise(load => new FontLoader().load("/fonts/Varino_Regular.json", load));

			camera.position.set(0, 250, -5);
			scene.add(new THREE.AmbientLight(0x777777));

			let screen;

			deskMesh = await new Promise(load => new OBJLoader().load("/3d/desk2.obj", load));
			deskMesh.name = "desk";
			deskMesh.traverse(child => {
				if(!(child instanceof THREE.Mesh)) return;
				if(child.name === "desk_drawer") {
					interactiveChildren.push(child);
					interactivesMeshes.push({
						name: child.name,
						defaultMaterial: new THREE.MeshPhongMaterial({ color: 0x151515 }),
						mesh: child,
						click: () => {
							if(drawer.opened) {
								drawer.opened = false;
								return drawer.group.forEach(mesh => {
									moveElement(mesh, new THREE.Vector3(0, 0, 0, new THREE.Vector3().copy(mesh.rotation))).play();
								});
							} else if(!drawer.locked) {
								drawer.group.forEach(mesh => {
									moveElement(mesh, new THREE.Vector3().copy(mesh.position).add(new THREE.Vector3(0, 0, -45), new THREE.Vector3().copy(mesh.rotation))).play();
								});
								drawer.opened = true;
							}
						}
					});
					drawer.group.push(child);
				}
				if(/rgb/.test(child.name)) {
					child.layers.enable(BLOOM_SCENE);
					child.material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
					rgbMeshes.push(child);
					return;
				}
				if(child.name === "screen") screen = child;
				if(/^keyboard\(.\)/.test(child.name)) {
					if(/_[1-9]$/.test(child.name)) return;
					const box = new BoxHelper(child, 0xffff00);
					// scene.add(box);

					const text = new THREE.Mesh(new TextGeometry(child.name.replace(/^keyboard\((.)\)/, "$1"), {
						font: varinoFont,
						size: .9,
						height: .25
					}), child.material = new THREE.MeshBasicMaterial({ color: 0x00ffff }));

					text.rotation.x = p2d(-90);
					text.rotation.z = p2d(180);
					const textSize = new THREE.Box3().setFromObject(text).getSize(new THREE.Vector3());
					const offset = child.geometry.boundingBox.getCenter(new THREE.Vector3());
					const position = offset.add(deskMesh.position).sub(new THREE.Vector3(
						-(textSize.x / 2),
						0,
						textSize.z / 2
					)).add(new THREE.Vector3(0, 1, 0));

					text.position.copy(position);

					text.layers.enable(BLOOM_SCENE);
					rgbMeshes.push(text);
					scene.add(text);

					interactivesMeshes.push({
						name: child.name,
						defaultMaterial: new THREE.MeshBasicMaterial({ color: 0x444444 }),
						mesh: child,
						click: () => {
							const audio = new Audio("/audios/switch-click.wav");
							audio.play();
							pushCombinaison(child.name.replace(/^keyboard\((.)\)/, "$1"));
							moveElement(child, new THREE.Vector3().copy(child.position).sub(new THREE.Vector3(0, .5, 0), new THREE.Vector3().copy(child.rotation)), .1, .05).repeat(1).yoyo(true).play();
							moveElement(text, new THREE.Vector3().copy(text.position).sub(new THREE.Vector3(0, .5, 0), new THREE.Vector3().copy(text.rotation)), .1, .05).repeat(1).yoyo(true).play();
						}
					});
				}
				if(/^(carpet|screen)/.test(child.name)) return child.material = new THREE.MeshBasicMaterial({ color: 0x1f1f1f1f });
				if(/^(mouse|keyboard)/.test(child.name)) return child.material = new THREE.MeshBasicMaterial({ color: 0x444444});
				if(/^(frame|foot)/.test(child.name)) return child.material = new THREE.MeshBasicMaterial({ color: 0x555555 });
				if(/^desk/.test(child.name)) return child.material = new THREE.MeshPhongMaterial({ color: 0x151515 });
			})
			scene.add(deskMesh);

			interactivesMeshes = interactivesMeshes.map(mesh => {
				return {
					...mesh,
					animating: false
				};
			});

			(() => {
				const group = new THREE.Group();
				const wall = new THREE.Mesh(new THREE.BoxGeometry(600, 250, 5), new THREE.MeshPhongMaterial({ color: 0x555555 }));
				scene.add(wall);
				wall.name = "wall";
				wall.position.set(0,90, 40);

			})();

			(() => {
				const group = new THREE.Group();
				const wall = new THREE.Mesh(new THREE.BoxGeometry(600, 5, 300), new THREE.MeshPhongMaterial({ color: 0x111111 }))
				scene.add(wall);
				wall.name = "floor";
				wall.position.set(0, -35, -100);

			})();

			(() => {
				const spotLight = new THREE.SpotLight(0x333333, 1, 270);
				spotLight.position.set(0, 250, -160);
				spotLight.castShadow = true;
				spotLight.intensity = 100
				scene.add(spotLight);
				const spotLightHelper = new THREE.SpotLightHelper(spotLight);
				// scene.add(spotLightHelper);
			})();

			(() => {
				const spotLight = new THREE.SpotLight(0x181818, 1, 400);
				spotLight.position.set(200, 200, -250);
				spotLight.castShadow = true;
				spotLight.intensity = 100
				scene.add(spotLight);
				const spotLightHelper = new THREE.SpotLightHelper(spotLight);
				// scene.add(spotLightHelper);
			})();

			(() => {
				const spotLight = new THREE.SpotLight(0x222222, .5, 350);
				spotLight.position.set(0, 250, -200);
				spotLight.rotation.z = p2d(100);
				spotLight.castShadow = true;
				spotLight.intensity = 100
				scene.add(spotLight);
				const spotLightHelper = new THREE.SpotLightHelper(spotLight);
				// scene.add(spotLightHelper);
			})();

			let shelves = [
				new THREE.Vector3(0, 0, 0),
			].map(shelve => {
				const mesh = new THREE.Mesh(new THREE.BoxGeometry(125, 5, 20), new THREE.MeshPhongMaterial({ color: 0x111111 }));
				mesh.position.copy(shelve.add(new THREE.Vector3(0, 115, 27.5)));
				const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
				scene.add(mesh);
				return {mesh, size};
			});

			const portalGun = await new Promise(async load => {
				const objLoader = new OBJLoader();
				await new Promise((resolve, reject) => {
					new MTLLoader().load("/3d/portal_gun.mtl", materials => {
						materials.preload();
						objLoader.setMaterials(materials);
						resolve();
					});
				});
				objLoader.load("/3d/portal_gun.obj", load);
			});

			let fuildContainer;

			portalGun.traverse(child => {
				if(/led/g.test(child.name)) {
					const color = child.name.replace(/led\_([a-z]*)(\_.*)/, "$1");
					child.layers.enable(BLOOM_SCENE);
					child.material = new THREE.MeshBasicMaterial({ color: color });
				}
				if(/fluid-container/g.test(child.name)) {
					child.layers.enable(BLOOM_SCENE);
					child.material = new THREE.MeshBasicMaterial({ color: 0x55ff55 });
					fuildContainer = child;
				}
			});

			const fuildPulseTl = gsap.timeline({ paused: true });

			const colors = [
				[85, 255, 85],
				[70, 230, 60],
			].map(color => {
				const divided = color.map(i => (i / 255));
				return {
					r: divided[0],
					g: divided[1],
					b: divided[2]
				}
			}).forEach(color => {
				fuildPulseTl.to(fuildContainer.material.color, {
					...color,
					duration: .5,
					ease: "circ.out"
				});
			});
			fuildPulseTl.repeat(-1).yoyo(true).play();

			portalGun.rotation.x = p2d(-65);
			portalGun.rotation.z = p2d(-15);
			portalGun.scale.set(.13, .13, .13);
			const portalGunSize = new THREE.Box3().setFromObject(portalGun).getSize(new THREE.Vector3());
			portalGun.position.fromArray(["x", "y", "z"].map(axe => shelves[0].mesh.position[axe])).add(new THREE.Vector3(
				40,
				(portalGunSize.y / 2) - 2.25,
				-5
			));
			scene.add(portalGun);

			[
				"About",
				"Works"
			].forEach(nav => {
				const li = $("<li>").appendTo($("nav > ul:nth-child(1)"));
				const letters = nav.split("");
				letters.forEach((letter, i) => {
				i += 1;
				let span = $("<span>");
				let delay = i / 20;
				if (i % 2 === 0) {
					delay -= 0.1;
				} else {
					delay += 0.05;
				}
				let letterOut =  $("<span>");
				letterOut.text(letter);
				letterOut.css({ "transition-delay": `${delay}s` });
				letterOut.addClass("out");
				span.append(letterOut);
				let letterIn = $("<span>");
				letterIn.text(letter);
				letterIn.css({ "transition-delay": `${delay}s` });
				letterIn.addClass("in");
				span.append(letterIn);
				li.append(span);
				});
			});

			setCurrentSlide(0);

		})();

		let rgbBool = false;
		let unHighlightBool = false;
		let raycasterTarget;

		sceneRef.current.addEventListener("click", event => {
			if(!raycasterTarget) return;
			if(!("click" in raycasterTarget)) return;
			raycasterTarget.click();
		});

		const highlightTarget = target => {
			if(target.animating) return;
			const currentColors = {
				r: target.mesh.material.color.r,
				g: target.mesh.material.color.g,
				b: target.mesh.material.color.b,
			};
			const selectedColor = { r: .2, g: .2, b: .2 };
			Object.keys(currentColors).forEach(key => selectedColor[key] = selectedColor[key] + currentColors[key]);
			const tl = gsap.timeline({ paused: true });
			tl.to(currentColors, {
				...selectedColor,
				duration: .2
			});
			tl.eventCallback("onUpdate", () => {
				const color = new THREE.Color(currentColors.r, currentColors.g, currentColors.b);
				target.mesh.material = target.defaultMaterial instanceof THREE.MeshBasicMaterial ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshPhongMaterial({ color });
			});
			tl.play();
			target.animating = true;
		};

		const unHighlightAll = () => {
			interactivesMeshes.forEach(object => {
				const currentColors = {
					r: object.mesh.material.color.r,
					g: object.mesh.material.color.g,
					b: object.mesh.material.color.b,
				};
				const selectedColor = {
					r: object.defaultMaterial.color.r,
					g: object.defaultMaterial.color.g,
					b: object.defaultMaterial.color.b
				};
				const tl = gsap.timeline({ paused: true });
				tl.to(currentColors, {
					...selectedColor,
					duration: .2
				});
				tl.eventCallback("onUpdate", () => {
					const color = new THREE.Color(currentColors.r, currentColors.g, currentColors.b);
					object.mesh.material = object.defaultMaterial instanceof THREE.MeshBasicMaterial ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshPhongMaterial({ color });
				});
				tl.play();
				object.animating = false;
			});
		};

		(function animate() {
			requestAnimationFrame(animate);
			scene.traverse(object => {
				if(object.isMesh && bloomLayer.test(object.layers)) return;
				materials[ object.uuid ] = object.material;
				object.material = darkMaterial;
			});
			bloomComposer.render();
			scene.traverse(object => {
				if (materials[object.uuid]) {
					object.material = materials[object.uuid];
					delete materials[object.uuid];
				}
			});
			finalComposer.render();

			if(rgbMeshes.length > 0 && !rgbBool) {
				rgbBool = true;
				rgbMeshes.forEach(mesh => {
					const colors = [
						[255, 0, 255],
						[107, 65, 255],
						[22, 99, 255],
						[0, 255, 255],
					].map(color => {
						const divided = color.map(i => (i / 255));
						return {
							r: divided[0],
							g: divided[1],
							b: divided[2]
						}
					});
					const tl = gsap.timeline({ paused: true });
					colors.forEach(color => {
						tl.to(mesh.material.color, {
							...color,
							duration: 2,
							ease: Linear.easeNone
						});
					});
					tl.repeat(-1).yoyo(true).play();
				});
			}

			if(deskMesh) {
				if(!unHighlightBool) unHighlightAll();
				unHighlightBool = true;
				raycaster.setFromCamera(mouse, camera);
				const intersects = raycaster.intersectObjects(deskMesh.children, false);
				if(intersects.length > 0) {
					const target = interactivesMeshes.find(mesh => mesh.name === intersects[0].object.name);
					if(target) {
						raycasterTarget = target;
						sceneRef.current.style.cursor = "pointer";
						highlightTarget(target);
					} else {
						raycasterTarget = null;
						sceneRef.current.style.cursor = "auto";
						unHighlightAll();
					}
				}
			};

			//dev
			controls.update();
			//--------------------
		})();
		container.appendChild(renderer.domElement);
	}, []);

	useEffect(() => {
		console.log("Hello World")
	}, [currentSlide]);

	return (
		<div className={`Home-route`}>
			<div id="Scene-container" ref={sceneRef}></div>
			<nav>
				<ul></ul>
			</nav>
			{ slides.map((slide, slideKey) => (
				<Slide slide={slideKey} key={slideKey}>
					<slide.component />
				</Slide>
			)) }
		</div>
	);
};