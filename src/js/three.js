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
    this.time = 0;

    this.camera = new T.PerspectiveCamera(
      70,
      device.width / device.height,
      0.01,
      1000
    );
    this.camera.position.set(0, 0, 3);
    this.scene.add(this.camera);

    this.renderer = new T.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(device.width, device.height);
    this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);

    this.controls = new OrbitControls(this.camera, this.canvas);

    this.raycaster = new T.Raycaster();

    this.pointer = new T.Vector2();

    this.isPlaying = true;

    this.setupFBO();
    this.setupEvents();
    this.addObjects();
    this.render();
    this.setResize();
  }

  setResize() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  setupEvents() {
    this.dummy=new T.Mesh(
      new T.PlaneGeometry(100,100),
      new T.MeshBasicMaterial()
    )
    /*this.ball=new T.Mesh(
      new T.SphereGeometry(0.1,12,12),
      new T.MeshBasicMaterial()
    )
    this.scene.add(this.ball);
    */
    document.addEventListener('pointermove', (e)=> {
      this.pointer.x = ( e.clientX / window.innerWidth) * 2 -1;
      this.pointer.y = -( e.clientY / window.innerHeight) * 2 +1;
      this.raycaster.setFromCamera(this.pointer, this.camera);
      let intersects = this.raycaster.intersectObject(this.dummy);
      if(intersects.length > 0){
        let{x,y} = intersects[0].point;
        this.fboMaterial.uniforms.uMouse.value = new T.Vector2(x,y);
        //this.ball.position.set(x,y,0)
      }
    })
  }

  //Feedback Object
  getRenderTarget() {
    const renderTarget = new T.WebGLRenderTarget( device.width, device.height, {
      minFilter: T.NearestFilter,
      magFilter: T.NearestFilter,
      format: T.RGBAFormat,
      type: T.FloatType,
    });
    return renderTarget
  }

  setupFBO(){
    this.size = 256
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
        uInfo: {value: null},
        uMouse: {value: new T.Vector2(0,0)},
      },
      vertexShader: simVertex,
      fragmentShader: simFragment,
    })
    //

    //randomess
    this.infoArray = new Float32Array(this.size * this.size * 4);

    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        let index = (i + j * this.size) * 4;
        this.infoArray[index + 0] = 0.5 + Math.random();
        this.infoArray[index + 1] = 0.5 + Math.random();
        this.infoArray[index + 2] = 1.;
        this.infoArray[index + 3] = 1.;
      }
    }
    this.info = new T.DataTexture(this.infoArray, this.size, this.size, T.RGBAFormat, T.FloatType);
    this.info.magFilter = T.NearestFilter
    this.info.minFilter = T.NearestFilter
    this.info.needsUpdate = true;
    this.fboMaterial.uniforms.uInfo.value = this.info;
    //

    this.fboMesh = new T.Mesh(geometry, this.fboMaterial)
    this.fboScene.add(this.fboMesh)

    //not needed?
    this.renderer.setRenderTarget(this.fbo);
    this.renderer.render(this.fboScene, this.fboCamera);
    this.renderer.setRenderTarget(this.fbo1);
    this.renderer.render(this.fboScene, this.fboCamera);
    //

  }

  /*resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this,this.height);
    this.camera.espect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }*/

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
      transparent: true,
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
    this.points.position.set(0,0,-1)
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

    this.fboMaterial.uniforms.uPositions.value = this.fbo1.texture;
    this.material.uniforms.uPositions.value = this.fbo.texture;
    
    this.renderer.setRenderTarget(this.fbo);
    this.renderer.render(this.fboScene, this.fboCamera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
    //this.renderer.render(this.fboScene, this.fboCamera);

    //swap render targets
    let temp = this.fbo;
    this.fbo = this.fbo1;
    this.fbo1 = temp;
    //console.log(this.time); 
   
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
