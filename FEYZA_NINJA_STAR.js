// author: feyzaseyrek
// date: 18.04.2021

"use strict";                                                                                                             

const starVertices = [														// Vertices of the star itself.
	vec2(0, 0),
	vec2(.5, 0),
	vec2(1, 1),
	vec2(0, .5),
	vec2(-1, 1),
	vec2(-.5, 0),
	vec2(-1, -1),
	vec2(0, -.5),
	vec2(1, -1),
	vec2(.5, 0),
];

let starScale = .5;															// Scale of star.

const circleVertices = [];													// Vertices of the "holes".
let circleLOD = 72; 														// The amount of vertices the holes will have.
let circleScale = .1;														// Scale of "hole".

let bgColor    = vec4(1, 1, 0, 1);											// Clear color.
let darkColor  = vec4(.3, .3, .3, 1);										// Star dark color.
let lightColor = vec4(.68, .68, .68, 1);									// Star light color.
let maxAngle   = 45;														// Star max. swing angle
let minAngle   = -45;														// Star min. swing angle.
let speed      = 0.015;														// Rate of change of angle/color.

window.onload = function init() { 											// This function runs on load of the web-page
	let canvas = document.getElementById("gl-canvas");						// Get the canvas element from DOM.
	let gl = canvas.getContext('webgl2');									// Request WebGL2 context.
	if (!gl) {																// If context couldn't be created...
		alert('Your browser doesn\'t support WEBGL');						// Alert the user.
	}

	gl.viewport(0, 0, canvas.width, canvas.height);							// Set the viewport to match the dimensions of canvas.
	gl.clearColor(bgColor[0], bgColor[1], bgColor[2], bgColor[3]);			// Set the background color.					

    let shader = initShaders(gl, "vertex-shader", "fragment-shader");		// Initialize shaders.
    gl.useProgram(shader);													// Use the program generated in the prev. line.

	for (let i = 0; i < circleLOD - 1; i++) {								// Generate circle vertices using polar coordinates.
		circleVertices.push(vec2(
			Math.cos(deg2rad(360 / (circleLOD - 2) * i)),
			Math.sin(deg2rad(360 / (circleLOD - 2) * i))
		));
	}

	let starVAO = gl.createVertexArray();									// Create VAO.
	gl.bindVertexArray(starVAO);											// Bind.
    let posLoc = gl.getAttribLocation(shader, "pos");						// Get vertex position attribute location.
    gl.enableVertexAttribArray(posLoc);										// Enable vertex position attribute.
	
	let starVBO = gl.createBuffer();										// Create VBO for vertices.
	gl.bindBuffer(gl.ARRAY_BUFFER, starVBO);								// Bind.
    gl.bufferData(gl.ARRAY_BUFFER, flatten(starVertices), gl.STATIC_DRAW);	// Write to the buffer,
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 2 * 4, 0);			// as 2 floats per vertex, each vertex taking 2 * 4 bytes of space.
	
	let circleVAO = gl.createVertexArray();									// Same deal as above...
	gl.bindVertexArray(circleVAO);
    gl.enableVertexAttribArray(posLoc);
	
	let circleVBO = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, circleVBO);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(circleVertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 2 * 4, 0);

	let swinging = false;													// Is star swinging?
	let starAngle = 0;
	
	let shading = false;													// Is star's color changing?
	let starColor = vec4(darkColor[0],
						darkColor[1],
						darkColor[2],
						darkColor[3]);
	
	let direction = 0;
	let percent = 0.5;
	window.onkeydown = function (event) {
		let key = String.fromCharCode(event.keyCode);
		if (key === '1' || key === 'a' ) {
			swinging = false;
			shading = false;
			starAngle = 0;
			starColor = vec4(darkColor[0], darkColor[1], darkColor[2], darkColor[3]);
			direction = 0;
			percent = 0.5;
		} else if (key === '2' || key === 'b') {
			swinging = true;
			shading = false;
			if (direction === 0) {
				direction = -speed;
			}
		} else if (key === '3' || key === 'c' ) {
			shading = true;
			swinging = true;
			if (direction === 0) {
				direction = -speed;
			}
		}
    };
	
	let modelLoc = gl.getUniformLocation(shader, "model");					// Get uniform locations...
	let colorLoc = gl.getUniformLocation(shader, "color");
	
	function render() {
		if (swinging) {
			starAngle = lerp(-45, 45, percent);	
		}
		if (shading) {
			let shadingPercent = Math.abs((percent - .5) * 2);
			starColor[0] = lerp(darkColor[0], lightColor[0], shadingPercent);
			starColor[1] = lerp(darkColor[1], lightColor[1], shadingPercent);
			starColor[2] = lerp(darkColor[2], lightColor[2], shadingPercent);
			starColor[3] = lerp(darkColor[3], lightColor[3], shadingPercent);
		}
		percent += direction;
		if (percent > 1) {
			direction = -speed;
		} else if (percent < 0) {
			direction = speed;
		}
		
		gl.clear(gl.COLOR_BUFFER_BIT);										// Clear the color buffer.
		
		let model = mat4();													// Create identity transform
		model = mult(model, rotate(starAngle, vec3(0, 0, 1)));				// Rotate,
		model = mult(model, scalem(starScale, starScale, 1));				// Scale.
		gl.uniformMatrix4fv(modelLoc, false, flatten(model));				// Send model matrix to shader
		gl.uniform4fv(colorLoc, flatten(starColor));
		
		// Star rendering
		gl.bindVertexArray(starVAO);										// Bind starVAO
		gl.drawArrays(gl.TRIANGLE_FAN, 0, starVertices.length);				// Render star
		
		// Holes rendering
		gl.bindVertexArray(circleVAO);										// Bind circleVAO
		gl.uniform4fv(colorLoc, flatten(bgColor));							// Set circle color
		
		model = mult(model, scalem(circleScale, circleScale, 1));			// Scale...
		gl.uniformMatrix4fv(modelLoc, false, flatten(model));				// Send model matrix to the shader
		gl.drawArrays(gl.TRIANGLE_FAN, 0, circleVertices.length);			// Render
		
		gl.uniformMatrix4fv(modelLoc, false, flatten(mult(model, translate(.5 / circleScale, 0, 0)))); // Same thing for bordering circles...
		gl.drawArrays(gl.TRIANGLE_FAN, 0, circleVertices.length);
		
		gl.uniformMatrix4fv(modelLoc, false, flatten(mult(model, translate(-.5 / circleScale, 0, 0))));
		gl.drawArrays(gl.TRIANGLE_FAN, 0, circleVertices.length);
		
		gl.uniformMatrix4fv(modelLoc, false, flatten(mult(model, translate(0, .5 / circleScale, 0))));
		gl.drawArrays(gl.TRIANGLE_FAN, 0, circleVertices.length);
		
		gl.uniformMatrix4fv(modelLoc, false, flatten(mult(model, translate(0, -.5 / circleScale, 0))));
		gl.drawArrays(gl.TRIANGLE_FAN, 0, circleVertices.length);

		requestAnimationFrame(render);	// Loop indefinitely
	}
    render();
};

function deg2rad(degrees) {
	return degrees * Math.PI / 180;
}

// Linear interpolation. Percent must be in range [0, 1]!
function lerp(start, end, percent) {
	return (start + percent * (end - start));
}
