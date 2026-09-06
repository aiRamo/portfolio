import * as THREE from 'three'
import { alpineSnowTexture } from './alpineSnow'

/** Weathered granite: geometry supplies the fractures; the material supplies mineral-scale relief. */
export function graniteMaterial(color = '#aaa79f', terrain = false) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: .9, vertexColors: terrain })
  const snowMap = terrain ? alpineSnowTexture() : null
  material.addEventListener('dispose', () => snowMap?.dispose())
  material.onBeforeCompile = shader => {
    if (snowMap) shader.uniforms.alpineSnowMap = { value: snowMap }
    shader.vertexShader = `varying vec3 granitePosition; varying float graniteUp; varying float graniteShade;
      ${terrain ? 'attribute float rockCoverage; varying float graniteCoverage; attribute float snowCoverage; varying float graniteSnow;' : 'attribute float rockOcclusion;'}
      ${shader.vertexShader}`.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec4 graniteVertex=vec4(position,1.);
      vec3 rockNormal=normal;
      #ifdef USE_INSTANCING
        graniteVertex=instanceMatrix*graniteVertex;
        mat3 rockInstance=mat3(instanceMatrix);
        rockNormal/=vec3(dot(rockInstance[0],rockInstance[0]),dot(rockInstance[1],rockInstance[1]),dot(rockInstance[2],rockInstance[2]));
        rockNormal=rockInstance*rockNormal;
      #endif
      granitePosition=(modelMatrix*graniteVertex).xyz;
      graniteUp=normalize(mat3(modelMatrix)*rockNormal).y;
      ${terrain ? 'graniteCoverage=rockCoverage; graniteSnow=snowCoverage; graniteShade=1.;' : 'graniteShade=rockOcclusion;'}
    `)
    shader.fragmentShader = `
      varying vec3 granitePosition; varying float graniteUp; varying float graniteShade;
      ${terrain ? 'varying float graniteCoverage; varying float graniteSnow; uniform sampler2D alpineSnowMap;' : 'const float graniteCoverage=1.;'}
      float graniteRelief=0.;
      float graniteHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float graniteNoise(vec3 p){
        vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(graniteHash(i),graniteHash(i+vec3(1,0,0)),f.x),mix(graniteHash(i+vec3(0,1,0)),graniteHash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(graniteHash(i+vec3(0,0,1)),graniteHash(i+vec3(1,0,1)),f.x),mix(graniteHash(i+vec3(0,1,1)),graniteHash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      ${shader.fragmentShader}
    `.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 p=granitePosition;
      float broad=graniteNoise(p*.085);
      float weather=graniteNoise(p*vec3(.28,.045,.25));
      float mineral=graniteNoise(p*3.7);
      float grain=graniteNoise(p*18.);
      float detail=1.-smoothstep(.025,.22,length(fwidth(p)));
      float mica=smoothstep(.65,.84,grain)*detail;
      float runoff=smoothstep(.60,.80,weather)*(1.-smoothstep(.35,.8,graniteUp));
      float vein=abs(sin(p.y*.21+p.x*.085+p.z*.10+(broad-.5)*1.7));
      float quartz=(1.-smoothstep(.025,.10,vein))*.07;
      vec3 stone=diffuseColor.rgb*mix(.82,1.10,broad)*mix(.92,1.06,weather);
      stone*=1.-runoff*.12-mica*.10;
      stone*=mix(.94,1.06,mineral);
      stone=mix(stone,stone*vec3(1.11,1.06,.98),smoothstep(.48,.75,broad)*.35);
      stone+=vec3(.14,.135,.12)*quartz;
      float lichen=smoothstep(.7,.87,mineral)*smoothstep(.35,.9,graniteUp);
      stone=mix(stone,stone*vec3(.79,.85,.65),lichen*.13);
      ${terrain ? '' : `float distance=max(0.,length(p.xz-vec2(-6.,62.))-75.);
      stone=mix(stone,vec3(.138,.238,.328),.75*(1.-exp(-pow(distance/190.,2.))));`}
      diffuseColor.rgb=mix(diffuseColor.rgb,stone,graniteCoverage)*graniteShade;
      float snowDetail=graniteNoise(p*vec3(.34,.12,.34));
      float settledSnow=${terrain
        ? 'smoothstep(.1,.7,graniteSnow+(snowDetail-.5)*.18)'
        : 'smoothstep(.60,.92,graniteUp)*smoothstep(10.,24.,p.y)*smoothstep(.5,.76,snowDetail)'};
      ${terrain ? `
      float alpine=smoothstep(115.,140.,-p.z);
      if(alpine>0.) {
        vec2 snowUV=(p.xz-vec2(-255.,-340.))/vec2(510.,240.);
        float edge=(texture2D(alpineSnowMap,snowUV).r-.5)*2.;
        float feather=max(.012,fwidth(edge)*.75);
        float cap=smoothstep(-feather,feather,edge)*smoothstep(16.,28.,p.y)*smoothstep(.28,.85,graniteUp);
        settledSnow=mix(settledSnow,cap,alpine);
        // Dark slate ribs provide readable separation from the bright snowfields.
        vec3 alpineRock=mix(vec3(.065,.087,.11),vec3(.16,.22,.28),broad);
        float rockRibs=graniteNoise(vec3(p.x*.48+p.z*.16,p.y*.12,p.z*.085));
        alpineRock*=mix(.70,1.10,rockRibs);
        float distance=max(0.,length(p.xz-vec2(-6.,62.))-75.);
        alpineRock=mix(alpineRock,vec3(.138,.238,.328),.52*(1.-exp(-pow(distance/190.,2.))));
        diffuseColor.rgb=mix(diffuseColor.rgb,alpineRock,alpine*smoothstep(25.,40.,p.y));
      }` : ''}
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.86,.91,.96)*(.97+.03*broad),settledSnow);
      graniteRelief=(weather*.016+mineral*.003+grain*.001*detail+quartz*.012)*graniteCoverage*(1.-settledSnow*.97);
    `).replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition);
      vec3 r1=cross(dy,normal),r2=cross(normal,dx);
      float determinant=dot(dx,r1)*faceDirection;
      vec3 gradient=dFdx(graniteRelief)*r1+dFdy(graniteRelief)*r2;
      normal=normalize(abs(determinant)*normal-sign(determinant)*gradient);
    `)
  }
  material.customProgramCacheKey = () => `sculpted-granite-v5-alpine-${terrain}`
  return material
}
