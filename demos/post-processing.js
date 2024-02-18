import PicoGL from "../node_modules/picogl/build/module/picogl.js";
import {mat4, vec3} from "../node_modules/gl-matrix/esm/index.js";

import {positions, uvs, indices} from "../blender/untitled.js";
import {positions as planePositions, indices as planeIndices} from "../blender/plane.js";

let fragmentShader = `
    #version 300 es
    precision highp float;
    
    uniform sampler2D tex;    
    
    in vec2 v_uv;
    
    out vec4 outColor;
    
    void main()
    {        
        outColor = texture(tex, v_uv);
    }
`;

let vertexShader = `
    #version 300 es
            
    uniform mat4 modelViewProjectionMatrix;
    
    layout(location=0) in vec3 position;
    layout(location=1) in vec3 normal;
    layout(location=2) in vec2 uv;
        
    out vec2 v_uv;
    
    void main()
    {
        gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);           
        v_uv = uv;
    }
`;

let skyboxFragmentShader = `
    #version 300 es
    precision mediump float;
    
    uniform samplerCube cubemap;
    uniform mat4 viewProjectionInverse;
    in vec4 v_position;
    
    out vec4 outColor;
    
    void main() {
      vec4 t = viewProjectionInverse * v_position;
      outColor = texture(cubemap, normalize(t.xyz / t.w));
    }
`;

let skyboxVertexShader = `
    #version 300 es
    
    layout(location=0) in vec4 position;
    out vec4 v_position;
    
    void main() {
      v_position = vec4(position.xz, 1.0, 1.0);
      gl_Position = v_position;
    }
`;

let app = PicoGL.createApp(document.querySelector('canvas'))
    .clearColor(0.0, 0.0, 0.0, 1.0)
    .depthTest();

let program = app.createProgram(vertexShader.trim(), fragmentShader.trim());
let skyboxProgram = app.createProgram(skyboxVertexShader.trim(), skyboxFragmentShader.trim());

let vertexArray = app.createVertexArray()
    .vertexAttributeBuffer(0, app.createVertexBuffer(PicoGL.FLOAT, 3, positions))
    .vertexAttributeBuffer(2, app.createVertexBuffer(PicoGL.FLOAT, 2, uvs))
    .indexBuffer(app.createIndexBuffer(PicoGL.UNSIGNED_INT, 3, indices));

let skyboxArray = app.createVertexArray()
    .vertexAttributeBuffer(0, app.createVertexBuffer(PicoGL.FLOAT, 3, planePositions))
    .indexBuffer(app.createIndexBuffer(PicoGL.UNSIGNED_INT, 3, planeIndices));

let projMatrix = mat4.create();
let viewMatrix = mat4.create();
let viewProjMatrix = mat4.create();
let modelMatrix = mat4.create();
let modelViewMatrix = mat4.create();
let modelViewProjectionMatrix = mat4.create();
let rotateXMatrix = mat4.create();
let rotateYMatrix = mat4.create();
let skyboxViewProjectionInverse = mat4.create();

async function loadTexture(fileName) {
    return await createImageBitmap(await (await fetch("images/" + fileName)).blob());
}

const tex = await loadTexture("Orange2.png");
let drawCall = app.createDrawCall(program, vertexArray)
    .texture("tex", app.createTexture2D(tex, tex.width, tex.height, {
        magFilter: PicoGL.LINEAR,
        minFilter: PicoGL.LINEAR_MIPMAP_LINEAR,
        maxAnisotropy: 10,
        wrapS: PicoGL.REPEAT,
        wrapT: PicoGL.REPEAT
    }));

let skyboxDrawCall = app.createDrawCall(skyboxProgram, skyboxArray)
    .texture("cubemap", app.createCubemap({
        negX: await loadTexture("Purple_bk.png"),
        posX: await loadTexture("Purple_ft.png"),
        negY: await loadTexture("stormydays_up.png"),
        posY: await loadTexture("stormydays_up.png"),
        negZ: await loadTexture("Purple_lf.png"),
        posZ: await loadTexture("Purple_rt.png")
    }));

    function draw(timems) {
        const time = timems * 0.001;
    
        // Existing camera and projection setup code remains unchanged
        mat4.perspective(projMatrix, Math.PI / 5, app.width / app.height, 0.1, 100.0);
        let camPos = vec3.rotateY(vec3.create(), vec3.fromValues(0, 0.5, 50), vec3.fromValues(0, 0, 0), time * 0.05);
        mat4.lookAt(viewMatrix, camPos, vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
        mat4.multiply(viewProjMatrix, projMatrix, viewMatrix);
    
        // Apply rotation to model
        mat4.fromYRotation(modelMatrix, time * 0.2235);
        mat4.multiply(modelMatrix, modelMatrix, rotateXMatrix);
        mat4.multiply(modelMatrix, modelMatrix, rotateYMatrix);
    
        // Inserted: Apply translation to move the model down along the Y-axis
        // The vec3.fromValues(0, -Y, 0) vector determines the translation magnitude and direction.
        // Replace 'Y' with the desired amount to move the model down.
        mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(0, -5, 0)); // Example: moving down by 5 units
    
        // Continue with combining the matrices for rendering
        mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
        mat4.multiply(modelViewProjectionMatrix, viewProjMatrix, modelMatrix);
    
        // Existing rendering and state management code remains unchanged
        app.clear();
        app.disable(PicoGL.DEPTH_TEST);
        app.disable(PicoGL.CULL_FACE);
        skyboxDrawCall.uniform("viewProjectionInverse", skyboxViewProjectionInverse);
        skyboxDrawCall.draw();
        app.enable(PicoGL.DEPTH_TEST);
        app.enable(PicoGL.CULL_FACE);
        drawCall.uniform("modelViewProjectionMatrix", modelViewProjectionMatrix);
        drawCall.draw();
        requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
