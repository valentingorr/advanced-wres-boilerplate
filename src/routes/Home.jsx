import React, {
	useState,
	useRef,
	useEffect
} from "react";

import "../style/home.scss";

import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { RectAreaLight } from "three/src/lights/RectAreaLight.js";
import { TextureLoader } from "three/src/loaders/TextureLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper.js";
import { BoxHelper } from "three/src/helpers/BoxHelper.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

import gsap from "gsap";
import $ from "jquery";
import anime from "animejs";

const p2d = n => n * (((Math.PI / 2) / 9) / 10);

export default props => {

	const slidesRef = new Array(5).fill().map(() => useRef());
	const sceneRef = useRef();


	const loaderRef = useRef();
	const [loading, setLoading] = useState(!true);

	useEffect(() => {
		(() => {
			const container = sceneRef.current;
			let [containerWidth, containerHeight] = [container.offsetWidth, container.offsetHeight];
			const ENTIRE_SCENE = 0, BLOOM_SCENE = 1;
			const bloomLayer = new THREE.Layers();
			bloomLayer.set(BLOOM_SCENE);

			const renderer = new THREE.WebGLRenderer({ antialias: false });
			renderer.toneMappingExposure = Math.pow(.75, 4.0)
			const scene = new THREE.Scene();
			const camera = new THREE.PerspectiveCamera( 60, containerWidth / containerHeight, 1, 200 );
			camera.position.set(0, 1, -5);

			const fxaaPass = new ShaderPass(FXAAShader);
			const copyPass = new ShaderPass(CopyShader);

			const bloomParameters = {
				exposure: .7,
				bloomStrength: 4,
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
			// const controls = new OrbitControls(camera, renderer.domElement);
			// controls.addEventListener( "change", event => {  
			//     console.log( controls.object.position ); 
			// } );
			//-------------------

			const darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });
			const materials = {};

			//scene------------------------------------------------------------------------------
			let scale = .05;
			(async () => {

				// camera.rotateY(180)
				camera.position.set(4, 8, 0);
				camera.lookAt(4, 8, 4)

				scene.traverse(object => object.material ? object.material.dispose() : null);
				scene.children.length = 0;

				scene.add(new THREE.AmbientLight(0x505050));

				(() => {
					const backGroup = (() => {
						const group = new THREE.Group();

						const wall = new THREE.Mesh(new THREE.BoxGeometry(100, 30, .5));
						wall.position.set(0, 5, 3);
						group.add(wall);

						wall.material = new THREE.MeshBasicMaterial({ color: 0x4d828b });

						return group;
					})();
					scene.add(backGroup);
					const rightGroup = (() => {
						const group = new THREE.Group();

						const wall = new THREE.Mesh(new THREE.BoxGeometry(.5, 30, 40));
						wall.position.set(-6, 5, 0);
						group.add(wall);

						wall.material = new THREE.MeshBasicMaterial({ color: 0x4c4c4c });

						return group;
					})();
					scene.add(rightGroup);
					const bottomGroup = (() => {
						const group = new THREE.Group();

						const wall = new THREE.Mesh(new THREE.BoxGeometry(100, .5, 40));
						wall.material = new THREE.MeshBasicMaterial({ color: 0x59686b });
						wall.position.set(0, -1.74, 0);
						group.add(wall);

						return group;
					})();
					scene.add(bottomGroup);
				})();

				//font
				const varinoFont = await new Promise(load => new FontLoader().load("/3d/fonts/Varino_Regular.json", load));
				const socialFont = await new Promise(load => new FontLoader().load("/3d/fonts/Smartphone_Regular.json", load));

				const furnitureMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });

				const gap = (5 * scale);

				const deskMesh = await new Promise(load => new OBJLoader().load("/3d/desk.obj", load));
				deskMesh.material = furnitureMaterial;
				deskMesh.scale.set(scale, scale, scale);
				const deskMeshSize = new THREE.Box3().setFromObject(deskMesh).getSize(new THREE.Vector3());
				deskMesh.position.set(
					(deskMeshSize.x / 2) + (gap / 2),
					0,
					0
				);
				scene.add(deskMesh);

				const screenMesh = await new Promise(load => new OBJLoader().load("/3d/screen.obj", load));
				deskMesh.add(screenMesh);
				screenMesh.position.set(0, 44.5, 25);

				const chairMesh = await new Promise(load => new OBJLoader().load("/3d/chair.obj", load));
				chairMesh.material = furnitureMaterial;
				let chairScale = .15;
				chairMesh.rotateY(p2d(20))
				chairMesh.scale.set(chairScale, chairScale, chairScale);
				chairMesh.position.set(
					8,
					-1.5,
					-4
				);
				scene.add(chairMesh);

				const shelveMesh = await new Promise(load => new OBJLoader().load("/3d/shelve.obj", load));
				shelveMesh.material = furnitureMaterial;
				shelveMesh.scale.set(scale, scale, scale);
				shelveMesh.rotateY(p2d(-10))
				const shelveMeshSize = new THREE.Box3().setFromObject(shelveMesh).getSize(new THREE.Vector3());

				shelveMesh.position.set(
					((shelveMeshSize.x / 2) * -1) - (gap / 2),
					(shelveMeshSize.y / 2) - (deskMeshSize.y / 2),
					0
				);

				const stagesMeshes = [];
				shelveMesh.traverse(child => {
					if(!(child instanceof THREE.Mesh)) return;
					if(!(/^stage/g.test(child.name))) return;
					const size = new THREE.Box3().setFromObject(child).getSize(new THREE.Vector3());
					const offset = child.geometry.boundingBox.getCenter(new THREE.Vector3());
					const position = offset.add(shelveMesh.position);
					stagesMeshes.push({ position, size, offset, mesh: child });
				});

				scene.add(shelveMesh);

				(() => {
					const spotLight = new THREE.SpotLight(0xffffff);
					spotLight.position.set(10, 2, 2.75);
					spotLight.castShadow = true;
					scene.add(spotLight);
					spotLight.target = screenMesh
					const spotLightHelper = new THREE.SpotLightHelper(spotLight);
					// scene.add(spotLightHelper);
				})();

				(() => {
					const spotLight = new THREE.SpotLight(0xffffff);
					spotLight.position.set(-5.5, 7, 2.75);
					spotLight.castShadow = true;
					scene.add(spotLight);
					spotLight.target = screenMesh;
					const spotLightHelper = new THREE.SpotLightHelper(spotLight);
					// scene.add(spotLightHelper);
				})();

				(() => {
					const spotLight = new THREE.SpotLight(0xffffff, .1);
					spotLight.position.set(-5, 7, -7);
					spotLight.castShadow = true;
					scene.add(spotLight);
					spotLight.target = screenMesh;
					const spotLightHelper = new THREE.SpotLightHelper(spotLight);
					// scene.add(spotLightHelper);
				})();

				const neon = () => new Promise(async (resolve, reject) => {
					const group = new THREE.Group();
					let bulb;
					const mesh = await new Promise(load => new OBJLoader().load("/3d/neon.obj", load));
					group.add(mesh);
					mesh.traverse(child => {
						if(!(child instanceof THREE.Mesh)) return;
						if(child.name === "light_bulb") {
							child.layers.enable(BLOOM_SCENE);
							bulb = child;
							return;
						}
						child.material = new THREE.MeshBasicMaterial({
							color: 0xeeeeee
						});
					});
					resolve({group, mesh, bulb});
				});

				// //stage 1 --------------------------------
				(async () => {
					const stage = stagesMeshes[0];
					const {group, mesh, bulb} = await neon();
					bulb.material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
					mesh.scale.set(.5, 1, 1);
					mesh.rotateY(Math.PI / -3);
					const meshSize = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
					mesh.position.set(
						-30 + (meshSize.x / 2),
						35 + 2.5 + (meshSize.y / 2),
						25 - (meshSize.z / 2)
					);
					stage.mesh.add(mesh);

					const light = new THREE.PointLight(0x00ffff, 10, 2.5);
					light.position.y = 35 + 2.5 + (meshSize.y / 2) + (35 / 2);
					stage.mesh.add(light);

					// //books
					const books = [
						"Website Dev",
						"Mobile App Dev",
						"Software Engineer",
						"Bot Creator",
					];

					for(let i = 0; i < books.length; i++) {
						const book = await new Promise(load => new OBJLoader().load("/3d/book.obj", load));
						if(i === (books.length - 1)) book.rotateZ(Math.PI / -7);
						const bookSize = new THREE.Box3().setFromObject(book).getSize(new THREE.Vector3());
						book.traverse(child => {
							if(!(child instanceof THREE.Mesh)) return;
							if(child.name === "pages") return child.material = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
							child.material = new THREE.MeshPhongMaterial({ color: 0xdddddd})
						});

						const text = new THREE.Mesh(new TextGeometry(books[i], {
							font: varinoFont,
							size: .75,
							height: .25
						}));

						text.rotateZ(Math.PI / 2);
						text.rotateX((Math.PI / 2) * 2);
						const textSize = new THREE.Box3().setFromObject(text).getSize(new THREE.Vector3());
						text.position.set(
							0 - (textSize.x / 2),
							-10 + 2,
							-6.5 - (textSize.z / 2) - 0.05
						);

						text.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
						// text.layers.enable(BLOOM_SCENE);
						book.add(text);

						book.position.set(
							30 - (bookSize.x / 2) - (i * 5),
							35 + 2.5 + (bookSize.y / 2),
							25 - (bookSize.z / 2)
						);
						stage.mesh.add(book);
					}

					// //cv paper
					const [sheetWidth, sheetHeight, sheetDepth] = [14, .4, 20];
					const sheetMesh = new THREE.Mesh(new THREE.BoxGeometry(sheetWidth, sheetHeight, sheetDepth));
					sheetMesh.rotateY(Math.PI / 1.5);
					stage.mesh.add(sheetMesh);

					const sheetMeterials = new Array(6).fill().map(() =>  new THREE.MeshBasicMaterial({ color: 0xffffff }));
					sheetMeterials[2] = new THREE.MeshBasicMaterial({ map: new TextureLoader().load("/3d/images/cv-sheet.png") });
					sheetMesh.material = sheetMeterials;

					sheetMesh.position.set(
						10,
						35 + 2.5 + (sheetHeight / 2),
						-10
					);
				})();

				(async () => {
					const stage = stagesMeshes[1];
					const {group, mesh, bulb} = await neon();
					bulb.material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
					mesh.rotateZ(Math.PI / 3);
					mesh.rotateY(Math.PI / 1.1);
					const meshSize = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
					mesh.position.set(
						30 - (meshSize.x / 2),
						-35 + 2.5 + (meshSize.y / 2),
						25 - (meshSize.z / 2)
					);
					stage.mesh.add(mesh);

					const light = new THREE.PointLight(0xff00ff, 10, 2.5);
					stage.mesh.add(light);
				})();

				//---------------------------

				// const pos = new THREE.Vector3(6, 1.5, 2);
				// const geometry = new THREE.BoxGeometry( .1, .1, .1 );
				// const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
				// const cube = new THREE.Mesh( geometry, material );
				// scene.add(cube);
				// cube.position.copy(pos)

				// controls.target = pos;

				const mooveElement = (element, pos=[0,0,0], rot=[0,0,0]) => {
					const smooth = 1000;
					const reduce = (current, accumulator) => {
						if(typeof current === "number") current = {x:current};
						if(!("y" in current)) {
							current.y = accumulator;
						} else {
							current.z = accumulator;
						}
						return current;
					};
					let currentPos = [element.position.x, element.position.y, element.position.z].map(n => n*smooth).reduce(reduce);
					let currentRot = [element.rotation.x, element.rotation.y, element.rotation.z].map(n => n*smooth).reduce(reduce);
					pos = pos.map(n => n*smooth).reduce(reduce);
					rot = rot.map(n => n*smooth).reduce(reduce);
					anime({
						targets: currentPos,
						...pos,
						easing: "easeInOutExpo",
						round: 1,
						update: function() {
							element.position.x = currentPos.x / smooth;
							element.position.y = currentPos.y / smooth;
							element.position.z = currentPos.z / smooth;
						}
					});
					anime({
						targets: currentRot,
						...rot,
						easing: "easeInOutExpo",
						round: 1,
						update: function() {
							element.rotation.x = currentRot.x / smooth;
							element.rotation.y = currentRot.y / smooth;
							element.rotation.z = currentRot.z / smooth;
						}
					});
				};

				const defaultChairPos = new THREE.Vector3().copy(chairMesh.position);
				const defaultChairRot = new THREE.Vector3().copy(chairMesh.rotation);

				const slides = [
					() => {
						mooveElement(camera, [-2.0, 6.45, -4], [p2d(180 + 10), p2d(-10), p2d(180)]);
						mooveElement(chairMesh, defaultChairPos.toArray(), defaultChairRot.toArray());
					},
					() => {
						mooveElement(camera, [-.5, 3.25, -6], [p2d(180 + 5), 0.125, p2d(180)]);
						mooveElement(chairMesh, defaultChairPos.toArray(), defaultChairRot.toArray());

					},
					() => {
						mooveElement(camera, [4, 5, -14], [p2d(180), 0, p2d(180)]);
						mooveElement(
							chairMesh,
							new THREE.Vector3().copy(defaultChairPos)/*.setX(8)*/.toArray(),
							new THREE.Vector3().copy(defaultChairRot)/*.setY(p2d(160))*/.toArray()
						);
					},
					() => {
						mooveElement(
							chairMesh,
							new THREE.Vector3().copy(defaultChairPos).setX(4.5).toArray(),
							new THREE.Vector3().copy(defaultChairRot).setY(p2d(180)).toArray()
						);
						setTimeout(() => {
							mooveElement(
								camera,
								[4.5, 3.5, 0],
								[p2d(180), 0, p2d(180)]
							);
						}, 100);
					}
				];

				const execSlide = index => {
					$("#slides-controls button").removeClass("current");
					$(`#slides-controls button[i=${index}]`).addClass("current");
					slides[index]();
				};

				for(let i = 0; i < slides.length; i++) {
					$("<button>", {
						type: "button",
						i: i,
						class: i === 0 ? "current": null
					}).click(() => execSlide(i))
					.appendTo($("aside#slides-controls"));
				};

				window.addEventListener("wheel", event => {
					let increment = 1;
					if(event.wheelDelta > 0) increment = -1;
					const currentIndex = parseInt($("#slides-controls button.current").attr("i"));
					if(currentIndex + increment < 0 || currentIndex + increment >= slides.length) return;
					execSlide(currentIndex + increment);
				});

				//dev
				// const gui = new GUI();
				// const folder = gui.addFolder("Bloom Parameters");
				// folder.add(bloomParameters, "exposure", 0.1, 2).onChange(value => renderer.toneMappingExposure = Math.pow(value, 4.0));
				// folder.add(bloomParameters, "bloomThreshold", 0.0, 1.0 ).onChange(value => bloomPass.threshold = Number(value));
				// folder.add(bloomParameters, "bloomStrength", 0.0, 10.0 ).onChange(value => bloomPass.strength = Number(value));
				// folder.add(bloomParameters, "bloomRadius", 0.0, 1.0).step(0.01).onChange(value => bloomPass.radius = Number(value));
				// scene.add(new THREE.AxesHelper(5));
				// const cameraLightHelper = new THREE.PointLightHelper(cameraLight, 1);
				// scene.add(cameraLightHelper);
				// scene.add(new THREE.GridHelper(20, 30));
				//-------------------

			})();
			//------------------------------------------------------------------------------

			(function animate() {
				const halfWidth = containerWidth / 2;
				requestAnimationFrame(animate);
				scene.traverse(object => {
					if (object.isMesh && bloomLayer.test( object.layers ) === false) {
						materials[ object.uuid ] = object.material;
						object.material = darkMaterial;
					}
				});
				bloomComposer.render();
				scene.traverse(object => {
					if ( materials[object.uuid] ) {
						object.material = materials[object.uuid];
						delete materials[object.uuid];
					}
				});
				finalComposer.render();
				//dev
				// controls.update();
				//--------------------
			})();
			container.appendChild(renderer.domElement);
		})();
	}, []);

	return (
		<div className={`Home-route${!loading ? " active" : ""}`}>
			{
				loading ?
					<div id="loader" ref={loaderRef}>
						<div className="wrapper">
							<h1>Valentin Gorrin</h1>
							<div className="loader"></div>
							<button
								type="button"
								component="button"
								className="bg-white"
								onClick={event => {
									const children = Array.from(loaderRef.current.childNodes).reverse();
									const out = new Array(children.length).fill(false);
									for (let i = 0; i < children.length; i++) {
										const tl = gsap.timeline({ paused: true })
										tl.to(children[i], {
											opacity: 1,
											yPercent: 0
										});
										tl.to(children[i], {
											opacity: 0,
											yPercent: 100,
											duration: .3
										});
										tl.delay(100 * i);
										tl.play().then(() => {
											out[i] = true;
											if(out.includes(false)) return;
											const tl = gsap.timeline({ paused: true });
											tl.to(loaderRef.current, { opacity: 1 });
											tl.to(loaderRef.current, { opacity: 0, duration: .3 });
											tl.play().then(() => setLoading(false));
										});
									}
								}}
							>Next</button>
						</div>
					</div>
				: null
			}
			<section>
				<div id="Scene-container" ref={sceneRef}></div>
				<aside id="slides-controls"></aside>
				<main>
					<div className="slide" i="0"></div>
				</main>
			</section>
		</div>
	);
};