import * as T from 'three';
// eslint-disable-next-line import/no-unresolved
//let OrbitControls = require("three-orbit-controls")(THREE);

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import vertex from '../shaders/vertexParticles.glsl';
import fragment from '../shaders/fragment.glsl';
import simVertex from '../shaders/simVertex.glsl';
import simFragment from '../shaders/simFragment.glsl';

/*const device = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: window.devicePixelRatio
};*/

export default class Three {
  constructor(options) {
    this.scene = new T.Scene();
    
    this.container = options.dom;
    this.width = this.container.offsetwidth;
    this.height = this.container.offsetheight;
    this.renderer = new T.WebGLRenderer();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0x000000, 1);
    this.container.appendChild(this.renderer.domElement);

    this.camera = new T.PerspectiveCamera(
      70,
      this.width / this.height,
      0.01,
      1000
    );
    this.camera.position.set(0, 0, 2);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.time = 0;

    //this.scene.add(this.camera);
    this.isPlaying = true;

    this.setupFBO();
    this.addObjects();
    this.render();
    this.setResize();

  }

  setResize() {
    window.addEventListener('resize', this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
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
    this.fboCamera.position.set(0,0,0.5);
    this.fboCamera.lookAt(0,0,0);
    let geometry = new T.PlaneGeometry(2,2);//geometry

    this.data = new Float32Array(this.size * this.size * 4);

    //donut space
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

    this.fboMesh = new T.Mesh(geometry, this.fboMaterial)
    this.fboScene.add(this.fboMesh)

    //not needed?
    this.renderer.setRenderTarget(this.fbo);
    this.renderer.render(this.fboScene, this.fboCamera);
    this.renderer.setRenderTarget(this.fbo1);
    this.renderer.render(this.fboScene, this.fboCamera);
    //

  }

  addObjects() {//addObjects
    
    this.material = new T.ShaderMaterial({
      extensions: {
        derivatives: "#extension GL_OES_standard_derivatives : enable"
      },
      side: T.DoubleSide,
      uniforms: {
        time: {value: 0},
        uPositions: {value: null},
        resolution: {value: new T.Vector4()},
      },
      //wireframe: true,
      vertexShader: vertex,//check
      fragmentShader: fragment//check
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

    this.material.uniforms.uPositions.value = this.fboTexture;
    this.points = new T.Points(geometry, this.material);//this.material
    this.points.size = 0.1;
    this.scene.add(this.points);
  }

  render() {
    if (!this.isPlaying) return;
    this.time += 0.05;
    this.material.uniforms.time.value = this.time;
    this.fboMaterial.uniforms.time.value = this.time;
    requestAnimationFrame(this.render.bind(this));

    //this.fboMaterial.uniforms.uPositions.value = this.fbo
    //this.material.uniforms.uPositions.value = this.fbo

    //this.fboMaterial.uniforms.uPositions.value = this.fbo1.texture;
    //this.material.uniforms.uPositions.value = this.fbo.texture;
    
    this.renderer.setRenderTarget(this.fbo);
    this.renderer.render(this.fboScene, this.fboCamera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
    //this.renderer.render(this.fboScene, this.fboCamera);

    //swap render targets
    let temp = this.fbo;
    this.fbo = this.fbo1;
    this.fbo = temp;
    //console.log(this.time); 
  }

}

new Three({
  dom: document.getElementById("container")
});