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

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BoxHelper } from "three/src/helpers/BoxHelper.js";

import gsap, {
	Linear
} from "gsap";
import $ from "jquery";

const p2d = n => n * (((Math.PI / 2) / 9) / 10);

export default props => {

	const sceneRef = useRef();

	useEffect(() => {
		const container = sceneRef.current;
		let [containerWidth, containerHeight] = [container.offsetWidth, container.offsetHeight];
		const ENTIRE_SCENE = 0, BLOOM_SCENE = 1;
		const bloomLayer = new THREE.Layers();
		bloomLayer.set(BLOOM_SCENE);

		const renderer = new THREE.WebGLRenderer({ antialias: false });
		renderer.toneMappingExposure = Math.pow(.75, 4.0)
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(50, containerWidth / containerHeight, 1, 1000);
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
		let drawerGroup = new THREE.Group();

		const rgbMeshes = [];
		let interactivesMeshes = [];
		const interactiveChildren = [];

		let keysCombination = "";
		const pushCombinaison = key => {
			keysCombination += key;
			console.log(keysCombination)
		};

		(async () => {
			camera.position.set(-500, 100, 0);
			scene.add(new THREE.AmbientLight(0x777777));

			let screen;

			deskMesh = await new Promise(load => new OBJLoader().load("/3d/desk.obj", load));
			deskMesh.name = "desk";
			deskMesh.traverse(child => {
				if(!(child instanceof THREE.Mesh)) return;
				if(child.name === "desk_drawer") {
					interactiveChildren.push(child);
					interactivesMeshes.push({
						name: child.name,
						defaultMaterial: new THREE.MeshPhongMaterial({ color: 0x151515 }),
						mesh: child
					});
				}
				if(/rgb/.test(child.name)) {
					child.layers.enable(BLOOM_SCENE);
					child.material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
					rgbMeshes.push(child);
					return;
				}
				if(child.name === "screen") {
					screen = child;
					// const box = new BoxHelper(child, 0xffff00);
					// scene.add(box);
				}
				if(/^keyboard\(.\)/.test(child.name)) {
					const box = new BoxHelper(child, 0xffff00);
					scene.add(box);
					interactivesMeshes.push({
						name: child.name,
						defaultMaterial: new THREE.MeshBasicMaterial({ color: 0x444444 }),
						mesh: child,
						click: () => {
							const audio = new Audio("/audios/switch-click.wav");
							audio.play();
							pushCombinaison(child.name.replace(/^keyboard\((.)\)/, "$1"))
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
				scene.add(mesh);
				return mesh;
			});

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
	})

	return (
		<div className={`Home-route`}>
			<div id="Scene-container" ref={sceneRef}></div>
		</div>
	);
};