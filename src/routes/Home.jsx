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
			const camera = new THREE.PerspectiveCamera( 40, containerWidth / containerHeight, 1, 200 );
			camera.position.set(0, 1, -5);

			const fxaaPass = new ShaderPass(FXAAShader);
			const copyPass = new ShaderPass(CopyShader);

			const bloomParameters = {
				exposure: 1,
				bloomStrength: 1.9,
				// bloomStrength: 0,
				bloomThreshold:0,
				bloomRadius: 0,
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

			const darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });
			const materials = {};

			//scene------------------------------------------------------------------------------
			let scale = .05;
			(async () => {
				scene.traverse(object => object.material ? object.material.dispose() : null);
				scene.children.length = 0;

				scene.add(new THREE.AmbientLight(0x404040));
				// object.layers.enable(BLOOM_SCENE);

				const cameraLight = new THREE.PointLight(0xeeffff, 1, 2.5);
				cameraLight.position.set(0, 40*scale, 0);
				// scene.add(cameraLight);

				//font
				const varinoFont = await new Promise(load => new FontLoader().load("/3d/fonts/Varino_Regular.json", load));
				const socialFont = await new Promise(load => new FontLoader().load("/3d/fonts/Smartphone_Regular.json", load));

				const shelveMesh = await new Promise((resolve, reject) => new OBJLoader().load("/3d/shelve.obj", resolve));
				shelveMesh.scale.set(scale, scale, scale);
				shelveMesh.position.set(0, 0, 0);
				const stagesMeshes = [];
				shelveMesh.traverse(child => {
					if(!(child instanceof THREE.Mesh)) return;
					if(!(/^stage/g.test(child.name))) return;
					const size = new THREE.Box3().setFromObject(child).getSize(new THREE.Vector3()).multiplyScalar(scale);
					const offset = child.geometry.boundingBox.getCenter(new THREE.Vector3());
					const position = offset.multiplyScalar(scale).add(shelveMesh.position);
					stagesMeshes.push({ position, size, offset });
				});
				scene.add(shelveMesh);

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
					mesh.scale.set(scale, scale, scale);
					resolve({group, mesh, bulb});
				});

				//stage 1 --------------------------------

				//neon 1
				const neon1 = await neon();
				neon1.bulb.material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
				neon1.mesh.scale.set((scale * .5), scale, scale);
				neon1.mesh.rotateY(Math.PI / -3);
				const neon1Size = new THREE.Box3().setFromObject(neon1.mesh).getSize(new THREE.Vector3());
				neon1.mesh.position.set(
					(stagesMeshes[0].position.x) - (stagesMeshes[0].size.x / 2) + (neon1Size.x / 2),
					(stagesMeshes[0].position.y) + (stagesMeshes[0].size.y / 2) + (neon1Size.y / 2),
					(stagesMeshes[0].position.z) + (stagesMeshes[0].size.z / 2) - (neon1Size.z / 2)
				);
				scene.add(neon1.mesh);
				const neon1Light = new THREE.PointLight(0x00ffff, 4, 3.5);
				neon1Light.position.copy(shelveMesh.position);
				neon1Light.position.y = neon1Light.position.y + (60 * scale);
				scene.add(neon1Light)

				//books
				const books = [
					"Website Dev",
					"Mobile App Dev",
					"Software Engineer",
					"Bot Creator",
				];

				for(let i = 0; i < books.length; i++) {
					const book = await new Promise((resolve, reject) => new OBJLoader().load("/3d/book.obj", resolve));
					book.scale.set(scale, scale, scale);
					book.traverse(child => {
						if(!(child instanceof THREE.Mesh)) return;
						if(child.name === "pages") return child.material = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
						child.material = new THREE.MeshPhongMaterial({ color: 0xdddddd})
					});
					if(i === (books.length - 1)) book.rotateZ(Math.PI / -7);
					const bookSize = new THREE.Box3().setFromObject(book).getSize(new THREE.Vector3());
					console.log(bookSize)
					let offset = 0;
					if(i !== 0) for(let j = 0; j < i; j++) offset += books[j].x;
					const text = new THREE.Mesh(new TextGeometry(books[i], {
						font: varinoFont,
						size: .75,
						height: .25
					}));
					text.rotateZ(Math.PI / 2);
					text.rotateX((Math.PI / 2) * 2);
					text.position.set(
						-.3,
						-8,
						-7
					)
					text.material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
					text.layers.enable(BLOOM_SCENE);
					book.add(text);
					book.position.set(
						(stagesMeshes[0].position.x) + (stagesMeshes[0].size.x / 2) - (bookSize.x / 2) - offset,
						(stagesMeshes[0].position.y) + (stagesMeshes[0].size.y / 2) + (bookSize.y / 2),
						(stagesMeshes[0].position.z) + (stagesMeshes[0].size.z / 2) - (bookSize.z / 2)
					);
					scene.add(book);
					books[i] = bookSize;
				}

				//cv paper
				const [sheetWidth, sheetHeight, sheetDepth] = [.7, .02, 1];
				const sheetMesh = new THREE.Mesh(new THREE.BoxGeometry(sheetWidth, sheetHeight, sheetDepth));
				scene.add(sheetMesh);

				const sheetMeterials = new Array(6).fill().map(() =>  new THREE.MeshBasicMaterial({ color: 0xffffff }));
				sheetMeterials[2] = new THREE.MeshBasicMaterial({ map: new TextureLoader().load("/3d/images/cv-sheet.png") });
				sheetMesh.material = sheetMeterials;

				sheetMesh.rotateY(Math.PI / 1.5)
				sheetMesh.position.set(
					(stagesMeshes[0].position.x) + .75,
					(stagesMeshes[0].position.y) + (stagesMeshes[0].size.y / 2) + (sheetHeight / 2),
					(stagesMeshes[0].position.z) - 0.5
				);

				//---------------------------

				//stage 2 --------------------------------

				//neon 2
				const neon2 = await neon();
				neon2.bulb.material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
				neon2.mesh.rotateZ(Math.PI / 3);
				neon2.mesh.rotateY(Math.PI / 1.1);
				const neon2Size = new THREE.Box3().setFromObject(neon2.mesh).getSize(new THREE.Vector3())//.multiplyScalar(scale);
				neon2.mesh.position.set(
					(stagesMeshes[1].position.x) + (stagesMeshes[1].size.x / 2) - (neon2Size.x / 2),
					(stagesMeshes[1].position.y) + (stagesMeshes[1].size.y / 2) + (neon2Size.y / 2),
					(stagesMeshes[1].position.z) + (stagesMeshes[1].size.z / 2) - (neon2Size.z / 2)
				);
				scene.add(neon2.mesh);
				const neon2Light = new THREE.PointLight(0xff00ff, 4, 3.5);
				neon2Light.position.copy(shelveMesh.position);
				scene.add(neon2Light);

				const cubes = [
					{
						text: "l",
						link: "http://instagram.com/valentingorr.dev"
					}
				];

				for(let i = 0; i < cubes.length; i++) {
					const cubeSize = .5;
					const cube = new THREE.Mesh(new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize));
					cube.material = new THREE.MeshPhongMaterial({ color: 0xff4e00 })
					cube.layers.enable(BLOOM_SCENE);
					const padding = 0.3;
					const text = new THREE.Mesh(new TextGeometry(cubes[i].text, {
						font: socialFont,
						size: (cubeSize - padding),
						height: cubeSize
					}));
					const textSize = new THREE.Box3().setFromObject(text).getSize(new THREE.Vector3());
					text.position.set(
						(textSize.x / 2) * -1,
						(textSize.y / 2) * -1,
						((textSize.z / 2) * -1) - .001
					);
					const box = new THREE.BoxHelper( text, 0xffff00 );
					scene.add(box);
					cube.add(text);
					scene.add(cube);
				};

				//---------------------------

				//dev
				const gui = new GUI();
				const folder = gui.addFolder("Bloom Parameters");
				folder.add(bloomParameters, "exposure", 0.1, 2).onChange(value => renderer.toneMappingExposure = Math.pow(value, 4.0));
				folder.add(bloomParameters, "bloomThreshold", 0.0, 1.0 ).onChange(value => bloomPass.threshold = Number(value));
				folder.add(bloomParameters, "bloomStrength", 0.0, 10.0 ).onChange(value => bloomPass.strength = Number(value));
				folder.add(bloomParameters, "bloomRadius", 0.0, 1.0).step(0.01).onChange(value => bloomPass.radius = Number(value));
				scene.add(new THREE.AxesHelper(5));
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
				controls.update();
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
			<div id="Scene-container" ref={sceneRef}></div>
		</div>
	);
};