uniform float time;
uniform float progress;
uniform sampler2D uPositions;
uniform vec4 resolution;
varying vec2 vUv;
varying vec3 vPosition;
float PI = 3.141592653589793238;

void main() {
    vec4 pos = texture2D(uPositions, vUv);
    gl_FragColor = pos;//vec4(vUv,0.0,1.);
    //gl_FragColor = vec4(vUv,0.0,1.);
}