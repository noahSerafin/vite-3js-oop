uniform float time;
uniform float progress;
uniform sampler2D texture1;
uniform vec4 resolution;
varying vec2 vUv;
varying vec4 vColor;
float PI = 3.141592653589793238;

void main() {

  gl_FragColor = vec4(1.);
  gl_FragColor = vColor;
}