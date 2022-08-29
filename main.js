const { app, BrowserWindow,ipcMain,BrowserView, screen } = require('electron');
const path        = require('path')
const Store       = require('electron-store');
// const fs          = require("fs");
// const urlExist    = require("url-exist");
const url         = require('url');
const AutoLaunch  = require('auto-launch');
const axios       = require('axios');
const sleep       = require('sleep-promise');
const { get }     = require('http');
const store       = new Store();
var win,view;        
var failedJobs    = [];

app.disableHardwareAcceleration();

app.whenReady().then(() => {
  createAgentWindow();
  buildHiddenView();

  ipcMain.on('setConfig', saveConfigs);
  ipcMain.on('getConfig',()=>{
    win.webContents.send('replyGetConfig', getConfig());
  });
  

  setInterval(() => {
    getNextPrintJob();
    printFailedJobs();
  },2500);

  
  app.on('activate', function () { 
    if (BrowserWindow.getAllWindows().length === 0) 
      createAgentWindow();
  });

  win.on('minimize',function(event){
    event.preventDefault();
    win.minimize();
  });
  
  win.on('close', function (event) {
    if(!app.isQuiting){
        event.preventDefault();
        win.minimize();
    }
    return false;
  });

  setStartup();
  
});


app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
});



const createAgentWindow = () => {
  buildAgentMainWindow();
  loadAgentHTML();
};

function buildAgentMainWindow(){
  let display = screen.getPrimaryDisplay();
  win         = new BrowserWindow({
    autoHideMenuBar: true,
    width: 350,
    height: 600,
    x: display.bounds.width - 350,
    y: display.bounds.height - 650,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.setResizable(false);
  // win.webContents.openDevTools();
}

function setStartup() {

  let configs = getConfig();
  if( configs.startup == 'on' )
  {
    let autoLaunch = new AutoLaunch({
      name: 'Printer Agent',
      path: app.getPath('exe'),
    });
    autoLaunch.isEnabled().then((isEnabled) => {
      if (!isEnabled) autoLaunch.enable();
    });
  }
}

function loadAgentHTML(){
  win.loadFile('./src/index.html');
}

function saveConfigs(event,input){
  store.set( 'config', JSON.stringify(input) ?? "")
}

function getConfig(){
  if( store.has('config')  )
  {
    let configData = JSON.parse(  store.get( 'config' ) );
    if( configData )
      return configData;
  }
  return "";
}


function getNextPrintJob(){
  let configs = getConfig();
  let url     = `${configs.ip}:${configs.port}`;
  if( configs.ip && configs.port && configs.printerName && configs.start == 'on' )
  {
    configs.printerName.split(',').forEach(eachPrinterName => {
      getAndPrintNextJob( url, eachPrinterName);
    });
    (async () => {
      await sleep(2500);
    })();
  }
}

function printFailedJobs(){
  if( !failedJobs ) return;
  failedJobs.forEach(element => {
    getAndPrintNextJob(element.url, element.printerName, true);
    (async () => {
      await sleep(2500);
    })();
  });
  failedJobs = [];
}



function getAndPrintNextJob( url, printerName, isFailedJob = false )
{
  axios.get(`${url}/system/prints/${printerName}`)
  .then(function (response) {
    if( response.data != '-' )
    {
      preview(response.data+'&hide=true')
      print(response.data+'&hide=true', printerName, isFailedJob)
    }
  })
  .catch(function (error) {
  });
}

function preview(url){
  win.webContents.send('updatePreviewFrame', url)
}

function print(url, printerName, isFailedJob = false){
  if( printerName )
  {
    view.webContents.loadURL(url).then(function(){
      view.webContents.print({
        silent: true, 
        printBackground: true, 
        deviceName: printerName
      });
    }).catch((error) => {
      
      if( !isFailedJob )
      {
        console.log(url,printerName,error.message);
        failedJobs.push({
          url : url,
          printerName: printerName
        });
      }
    });
  }
}

function buildHiddenView(){
  view = new BrowserView()
  win.setBrowserView(view)
  view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
}

