<script setup>
// import SwateView from './components/SwateView.vue'
import {ref,reactive,onMounted} from 'vue';
import {ARC} from "@nfdi4plants/arctrl";
import {Xlsx} from '@fslab/fsspreadsheet/Xlsx.js';
import {JsonController} from "@nfdi4plants/arctrl";


const iProps = reactive({
  arc: null
});

let iframe = ref({});

const toSwate = (api,data) => {
  const content = { swate: true, api: api, data: data }
  iframe.value.contentWindow.postMessage(content, '*');
};

const vscodeGet = outMessage=>new Promise((resolve)=>{
  outMessage.acid = 1+Math.random();
  const listener = event=>{
    const inMessage = event.data;
    if(inMessage.acid !== outMessage.acid) return;
    window.removeEventListener("message", listener);
    resolve(inMessage);
  };
  window.addEventListener("message", listener);
  window.vscode.postMessage(outMessage);
});

const API = {
  read_ARC: async inMessage=>{
    const arc = ARC.fromFilePaths(inMessage.xlsx_paths);
    const contracts = arc.GetReadContracts();
    for(const contract of contracts){
      const response = await vscodeGet({api:'readXLSX',path:contract.Path});
      const buffer = new Uint8Array(response.xlsx.data);
      contract.DTO = await Xlsx.fromBytes(buffer);
    }
    arc.SetISAFromContracts(contracts);
    iProps.arc = arc;
    console.log('arc',arc);
  },

  edit_study: async inMessage=>{
    console.log('edit_study',inMessage.name);
    const study = iProps.arc.ISA.TryGetStudy(inMessage.name);
    toSwate(
      'StudyToSwate',
      { ArcStudyJsonString: JsonController.Study.toJsonString(study,0) }
    );
  },

  edit_investigation: async ()=>{
    console.log('edit_investigation');
    toSwate(
      'InvestigationToSwate',
      { ArcInvestigationJsonString: JsonController.Investigation.toJsonString(iProps.arc.ISA,0) }
    );
  }
};

const process_message = event => {
  const inMessage = event.data;
  if(!inMessage.acid || !inMessage.api) return;
  API[inMessage.api](inMessage);
}

window.addEventListener("message", process_message);

const init = ()=>{
  iframe.value.setAttribute("src", `https://swate-alpha.nfdi4plants.org?is_swatehost=1&random=${parseInt(Math.random()*1000)}`);
}

onMounted(init);

</script>

<template>
  <q-layout view="hHh LpR fFf">
    <q-page-container class='full'>
      <iframe
        class='fit'
        style="border: 0; overflow: hidden; margin-bottom: -1em"
        ref="iframe"
        allow='clipboard-read;clipboard-write;'
      >
      </iframe>
    </q-page-container>
  </q-layout>
</template>

<style>
.full{
  position:absolute;
  top:0;
  left:0;
  bottom:0;
  right:0;
}
</style>
