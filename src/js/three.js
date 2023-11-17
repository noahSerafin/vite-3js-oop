import * as T from 'three';
// eslint-disable-next-line import/no-unresolved
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import vertex from '../shaders/vertexParticles.glsl';
import fragment from '../shaders/fragment.glsl';
import simVertex from '../shaders/simVertex.glsl';
import simFragment from '../shaders/simFragment.glsl';

const device = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: window.devicePixelRatio
};

export default class Three {
  constructor(canvas) {
    this.canvas = canvas;

    this.scene = new T.Scene();

    this.camera = new T.PerspectiveCamera(
      75,
      device.width / device.height,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 2);
    this.scene.add(this.camera);

    this.renderer = new T.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(device.width, device.height);
    this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2));

    this.controls = new OrbitControls(this.camera, this.canvas);

    this.clock = new T.Clock();

    this.setLights();
    this.setupFBO();
    this.setGeometry();
    this.render();
    this.setResize();
  }

  setLights() {
    this.ambientLight = new T.AmbientLight(new T.Color(1, 1, 1, 1));
    this.scene.add(this.ambientLight);
  }

  setGeometry() {//addObjects
    
    this.planeMaterial = new T.ShaderMaterial({
      side: T.DoubleSide,
      //wireframe: true,
      fragmentShader: fragment,
      vertexShader: vertex,
      uniforms: {
        time: {value: 0},
        uPositions: {value: null},
        resolution: {value: new T.Vector4()},
      }
    });

    this.count = this.size**2;
    let geometry = new T.BufferGeometry()
    let positions = new Float32Array(this.count * 3)
    let uv = new Float32Array(this.count * 2)
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        let index = (i + j * this.size);
        positions[index * 3 + 0] = Math.random();
        positions[index * 3 + 1] = Math.random();
        positions[index * 3 + 2] = 0;
        uv[index * 2 + 0] = i / this.size;
        uv[index * 2 + 1] = j / this.size;
      }      
    }
    geometry.setAttribute('position', new T.BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new T.BufferAttribute(uv, 2))

    this.planeGeometry = new T.PlaneGeometry(1, 1, 128, 128);
    this.planeMesh = new T.Mesh(this.planeGeometry, this.planeMaterial);
    this.scene.add(this.planeMesh);
  }

  //Feedback Object
  getRenderTarget() {
    const renderTarget = new T.WebGLRenderTarget( this.width, this.height, {
      minFilter: T.NearestFilter,
      magFilter: T.NearestFilter,
      format: T.RGBAFormat,
      type: T.FloatType,
    });
    return renderTarget
  }

  setupFBO(){
    this.size = 128
    this.fbo = this.getRenderTarget()
    this.fbo1 = this.getRenderTarget()
    this.fboScene = new T.Scene()
    this.fboCamera = new T.OrthographicCamera(-1,1,1,-1,-1,1);
    this.fboCamera.lookAt(0,0,0);
    let fbgeometry = new T.PlaneGeometry(2,2);

    this.data = new Float32Array(this.size * this.size * 4);

    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        let index = (i + j * this.size) * 4;
        let theta = Math.random() * Math.PI * 2
        let r = 0.5 + 0.5*Math.random()
        this.data[index + 0] = r*Math.cos(theta);
        this.data[index + 1] = r*Math.sin(theta);
        this.data[index + 2] = 1.;
        this.data[index + 3] = 1.;
      }
    }
    this.fboTexture = new T.DataTexture(this.data, this.size, this.size, T.RGBAFormat, T.FloatType);
    this.fboTexture.magFilter = T.NearestFilter
    this.fboTexture.minFilter = T.NearestFilter
    this.fboTexture.needsUpdate = true;

    this.fboMaterial = new T.ShaderMaterial({
      uniforms: {
        uPositions: {value: this.fboTexture},
        time: {value: 0},
      },
      vertexShader: simVertex,
      fragmentShader: simFragment,
    })

    this.fboMesh = new T.Mesh(fbgeometry, this.fboMaterial)
    this.fboScene.add(this.fboMesh)

  }

  render() {
    const elapsedTime = this.clock.getElapsedTime();

    //this.planeMesh.rotation.x = 0.2 * elapsedTime;
    //this.planeMesh.rotation.y = 0.1 * elapsedTime;

    this.renderer.render(this.scene, this.camera);
    
    //this.renderer.render(this.fboScene, this.fboCamera);
    //requestAnimationFrame(this.render.bind(this));
  }

  setResize() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    device.width = window.innerWidth;
    device.height = window.innerHeight;

    this.camera.aspect = device.width / device.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(device.width, device.height);
    this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2));
  }
}
