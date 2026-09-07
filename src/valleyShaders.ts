import * as THREE from 'three'

const noiseGLSL = `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }
  float fbm(vec2 p) {
    float n=0.; float a=.55;
    for(int i=0;i<4;i++){n+=noise(p)*a;p=mat2(1.6,1.2,-1.2,1.6)*p+17.;a*=.48;}
    return n;
  }
`

export function makeSkyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      sun: { value: new THREE.Vector3() }, moon: { value: new THREE.Vector3() },
      night: { value: 0 }, twilight: { value: 0 }, golden: { value: 0 }, time: { value: 0 },
      ascent: { value: 0 },
      cosmosRotation: { value: new THREE.Matrix3() },
    },
    vertexShader: `varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      varying vec3 vDirection; uniform vec3 sun; uniform vec3 moon;
      uniform float night; uniform float twilight; uniform float golden; uniform float time; uniform float ascent;
      uniform mat3 cosmosRotation;
      ${noiseGLSL}
      void main(){
        vec3 rd=normalize(vDirection);
        float height=pow(clamp(rd.y,0.,1.),.48);
        vec3 day=mix(vec3(.95,.60,.23),vec3(.055,.25,.46),smoothstep(0.,.70,height));
        vec3 upperDay=mix(vec3(.48,.72,.91),vec3(.14,.38,.66),smoothstep(.4,1.,rd.y));
        day=mix(day,upperDay,ascent);
        vec3 dark=mix(vec3(.027,.044,.073),vec3(.003,.008,.023),height);
        vec3 color=mix(day,dark,night);
        vec3 dusk=mix(vec3(1.1,.24,.065),vec3(.145,.10,.25),height);
        color=mix(color,dusk,twilight*.96);
        float sunDot=max(0.,dot(rd,sun));
        float moonDot=max(0.,dot(rd,moon));
        color+=vec3(1.,.54,.14)*pow(sunDot,12.)*(.16+twilight*.6+golden*.08)*(1.-night*.7);
        color+=vec3(.24,.34,.58)*pow(moonDot,90.)*night*.12;

        // A restrained, broken band of interstellar haze, fixed to the rotating star field.
        // Reuse the sky pass, with no extra geometry, textures, or daytime noise work.
        if(night>.15) {
          vec3 cosmos=cosmosRotation*rd;
          vec2 nebulaUV=vec2(dot(cosmos,vec3(.8,0.,-.6)),dot(cosmos,vec3(.36,.8,.48)));
          float bandDistance=dot(cosmos,vec3(.48,-.6,.64));
          float broad=fbm(nebulaUV*3.2+vec2(7.4,19.2));
          float filaments=fbm(nebulaUV*vec2(9.,18.)+broad*2.);
          float band=exp(-pow((bandDistance+(broad-.5)*.2)/.19,2.));
          float veil=band*smoothstep(.34,.72,filaments)*smoothstep(.02,.35,rd.y);
          vec3 dust=mix(vec3(.008,.005,.010),vec3(.006,.010,.018),broad);
          color+=dust*veil*smoothstep(.4,1.,night)*(1.-twilight)*(1.-pow(moonDot,18.)*.75);

          // One Andromeda-inspired inclined galaxy, anchored to the same celestial sphere.
          // The front-facing cap prevents an antipodal duplicate and bounds the detail work.
          vec3 galaxyCenter=normalize(vec3(.94531,.31740,.07516));
          float galaxyFacing=dot(cosmos,galaxyCenter);
          if(galaxyFacing>.98) {
            vec3 galaxyRight=normalize(cross(vec3(0.,1.,0.),galaxyCenter));
            vec3 galaxyUp=cross(galaxyCenter,galaxyRight);
            vec2 galaxyUV=vec2(dot(cosmos,galaxyRight),dot(cosmos,galaxyUp));
            galaxyUV=mat2(.82,-.5724,.5724,.82)*galaxyUV;
            vec2 ellipse=galaxyUV/vec2(.045,.013);
            float radius=length(ellipse);
            float halo=exp(-radius*radius*.75);
            float disk=exp(-radius*2.4);
            float core=exp(-radius*radius*38.);
            float dustLane=exp(-pow((ellipse.y-.18)/.12,2.))*exp(-abs(ellipse.x)*1.6);
            float grain=.9+.1*noise(ellipse*12.);
            vec3 galaxy=vec3(.013,.017,.025)*halo+vec3(.034,.037,.043)*disk*grain*(1.-dustLane*.35);
            galaxy+=vec3(.075,.069,.055)*core;
            color+=galaxy*smoothstep(.4,1.,night)*(1.-twilight)*smoothstep(.02,.25,rd.y);
          }
        }

        // Soft, wind-stretched cloud banks: density and lit edges travel together.
        vec2 cloudUV=rd.xz/max(.16,rd.y+.25)*1.9+vec2(time*.024,time*.004);
        float density=fbm(cloudUV*vec2(1.35,3.8));
        float wisps=fbm(cloudUV*vec2(2.1,9.5));
        density=mix(density,wisps,smoothstep(.35,.8,rd.y));
        float cloud=smoothstep(.50,.72,density)*smoothstep(.025,.15,rd.y);
        float edge=smoothstep(.37,.55,density)-smoothstep(.48,.67,density);
        vec3 cloudColor=mix(vec3(.98,.70,.37),vec3(.025,.039,.065),night);
        vec3 upperCloud=mix(vec3(.83,.90,1.),vec3(.055,.085,.15),night);
        cloudColor=mix(cloudColor,upperCloud,ascent);
        cloud*=mix(1.,.50,ascent);
        cloudColor=mix(cloudColor,vec3(.72,.21,.13),twilight*.8);
        cloudColor+=edge*vec3(.70,.36,.09)*(1.-night)*(.5+pow(sunDot,8.));
        // Broad underside illumination from the sun/moon now below the camera's field of view.
        cloudColor+=edge*ascent*mix(vec3(.16,.18,.20),vec3(.07,.12,.22),night);
        color=mix(color,cloudColor,cloud*.8);

        float sunDisc=smoothstep(cos(.022),cos(.019),sunDot);
        color+=sunDisc*mix(vec3(4.,2.9,1.1),vec3(4.,.95,.13),twilight)*(1.-cloud*.4);
        float moonDisc=smoothstep(cos(.0175),cos(.015),moonDot);
        if(moonDisc>0. && night>0.) {
          vec3 right=normalize(cross(moon,vec3(0,1,0)));
          vec3 up=cross(right,moon);
          vec2 moonUV=vec2(dot(rd,right),dot(rd,up))/.017;
          float craters=fbm(moonUV*6.)*.21+smoothstep(.1,.36,length(moonUV-vec2(.25,.24)))*.08;
          float lunarLight=.82+.18*moonUV.x;
          color+=moonDisc*(vec3(.74,.82,.75)-craters)*lunarLight*night*1.55;
        }
        gl_FragColor=vec4(max(color,vec3(0.)),1.);
      }
    `,
  })
}

export const lakeShader = {
  name: 'AlpineReflection',
  uniforms: {
    color: { value: new THREE.Color('#527d72') }, tDiffuse: { value: null }, textureMatrix: { value: new THREE.Matrix4() },
    time: { value: 0 }, night: { value: 0 }, twilight: { value: 0 },
    lightDirection: { value: new THREE.Vector3() }, lightColor: { value: new THREE.Color() }, eye: { value: new THREE.Vector3() },
  },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 reflectionUV; varying vec3 world;
    void main(){world=(modelMatrix*vec4(position,1.)).xyz;reflectionUV=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; uniform float night; uniform float twilight;
    uniform vec3 lightDirection; uniform vec3 lightColor; uniform vec3 eye;
    varying vec4 reflectionUV; varying vec3 world;
    ${noiseGLSL}
    void main(){
      vec2 p=world.xz;
      float waveA=sin(dot(p,vec2(.45,1.6))-time*1.35+sin(p.x*.27)*.9);
      float waveB=sin(dot(p,vec2(1.25,.45))+time*.8);
      float waveC=sin(dot(p,vec2(-.6,3.9))-time*2.05);
      float breeze=.55+.45*noise(p*.23+vec2(time*.06));
      vec2 ripple=vec2(waveA+waveB*.4,waveB+waveC*.35)*vec2(.0034,.0026)*breeze;
      vec2 uv=reflectionUV.xy/reflectionUV.w;
      vec3 reflection=texture2D(tDiffuse,uv+ripple).rgb;
      vec3 view=normalize(eye-world);
      float fresnel=.34+.58*pow(1.-max(0.,view.y),3.);
      vec3 deep=mix(vec3(.045,.12,.15),vec3(.008,.025,.033),night);
      vec3 result=mix(deep,reflection,fresnel);
      vec3 normal=normalize(vec3((waveA*.045+waveC*.012)*breeze,1.,(waveB*.038+waveC*.014)*breeze));
      float glint=pow(max(0.,dot(reflect(-lightDirection,normal),view)),220.);
      result+=glint*lightColor*(.16+twilight*.35);
      float crest=pow(max(0.,waveA*.65+waveC*.35),5.)*breeze;
      result+=vec3(.48,.63,.67)*crest*.038*(1.-night*.55);
      gl_FragColor=vec4(result,1.);
    }
  `,
}

export const landscapeFinish = {
  uniforms: {
    tDiffuse: { value: null }, resolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 resolution; varying vec2 vUv;
    void main(){
      vec4 c=texture2D(tDiffuse,vUv);
      float foreground=1.-smoothstep(0.,.15,vUv.y);
      vec2 offset=vec2(1.1)/resolution*foreground;
      c=c*.6+(texture2D(tDiffuse,vUv+offset)+texture2D(tDiffuse,vUv-offset))*.2;
      float vignette=smoothstep(.22,.84,length((vUv-.5)*vec2(1.,.85)));
      c.rgb*=1.-vignette*.26;
      float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
      c.rgb+=grain*.0018;
      gl_FragColor=vec4(max(c.rgb,vec3(0.)),1.);
    }
  `,
}
