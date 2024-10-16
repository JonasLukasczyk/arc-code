<script lang='ts' setup>

import { onMounted, ref } from 'vue';
import {JsonController} from "@nfdi4plants/arctrl";

let iframe = ref({});

const toSwate = data => {
  const content = { swate: true, api: 'InvestigationToSwate', data: data }
  iframe.value.contentWindow.postMessage(content, '*');
};

const SwateAPI = {
  handleEvent: e => {
    console.warn('->',e);
    e.data.swate && SwateAPI[e.data.api](e.data.data);
  },
  Init: ()=> {
    console.log('Init');
    const jsonString = '{"Identifier":"xxxx","Description":"test test"}';
    toSwate({ ArcInvestigationJsonString: jsonString });
  },
  InvestigationToARCitect: (investigationJsonString: string) => {
    let investigation = JsonController.Investigation.fromJsonString(investigationJsonString);
    console.log(investigation);
  },
  Error: (e) => {
    console.log('[Swate-Interop-Error]', e)
  }
}

const init = async ()=>{
  console.log('hello');
  window.addEventListener("message", SwateAPI.handleEvent);
  iframe.value.setAttribute("src", `https://swate-alpha.nfdi4plants.org?is_swatehost=1&random=${parseInt(Math.random()*1000)}`);
};

onMounted(init);

</script>

<template>
  <iframe
    class='fit'
    style="border: 0; overflow: hidden; margin-bottom: -1em"
    ref="iframe"
    allow='clipboard-read;clipboard-write;'
  >
  </iframe>

</template>
