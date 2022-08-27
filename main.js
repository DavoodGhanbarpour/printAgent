const { app, BrowserWindow,ipcMain,BrowserView, screen } = require('electron');
const path        = require('path')
const fs          = require("fs");
const axios       = require('axios');
const sleep     = require('sleep-promise');
const CONFIG_PATH = './config/agentConfig.json';
var win,view;        
app.disableHardwareAcceleration();

app.whenReady().then(() => {
  createAgentWindow();
  buildHiddenView();
  ipcMain.on('setConfig', saveConfigs);
  setInterval(() => {
    getNextPrintJob();
  },2000);

  
  app.on('activate', function () { 
    if (BrowserWindow.getAllWindows().length === 0) 
      createAgentWindow();
  });

  // win.on('minimize',function(event){
  //   event.preventDefault();
  //   win.minimize();
  // });
  
  // win.on('close', function (event) {
  //   if(!app.isQuiting){
  //       event.preventDefault();
  //       win.minimize();
  //   }
  //   return false;
  // });
  
});


app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
});





const createAgentWindow = () => {
  buildAgentMainWindow();
  loadAgentHTML();
  loadConfigToAgent();
};

function buildAgentMainWindow(){
  let display = screen.getPrimaryDisplay();
  win         = new BrowserWindow({
    autoHideMenuBar: true,
    width: 400,
    height: 600,
    x: display.bounds.width - 400,
    y: display.bounds.height - 650,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.setResizable(false);
}

function loadConfigToAgent(){
  win.webContents.send('getConfig', getConfig());
}

function loadAgentHTML(){
  win.loadFile('./src/index.html');
}

function saveConfigs(event,input){
  fs.writeFile( CONFIG_PATH , JSON.stringify(input), function (err,data) {
    if (err) {
      return console.log(err);
    }
  });
}

function getConfig(){
  let configData = JSON.parse( fs.readFileSync( CONFIG_PATH ) );
  if( configData )
    return configData;
  else
    return "";
}


function getNextPrintJob(){
  let configs = getConfig();
  if( configs.ip && configs.port && configs.printerName )
  {
    configs.printerName.split(',').forEach(eachPrinterName => {
      getPrinterJob( `${configs.ip}:${configs.port}`, eachPrinterName )
    });
    (async () => {
      await sleep(1000);
    })();
  }
}


function getPrinterJob( url, printerName )
{
  axios.get(`${url}/system/prints/${printerName}`)
  .then(function (response) {
    if( response.data != '-' )
    {
      preview(response.data+'&hide=true')
      print(response.data+'&hide=true')
    }
  })
  .catch(function (error) {
    console.log(error);
  })
  .then(function () {
  });  
}

function preview(url){
  win.webContents.send('updatePreviewFrame', url)
}

function print(url){
  let configs = getConfig();
  if( configs.printerName )
  {
    console.log(url)
    view.webContents.loadURL(url)
    view.webContents.on('did-finish-load', function() {
      view.webContents.print({
        silent: true, 
        printBackground: true, 
        deviceName: configs.printerName
      })  
    });
  }
}

function buildHiddenView(){
  view = new BrowserView()
  win.setBrowserView(view)
  view.setBounds({ x: 0, y: 550, width: 550, height: 550 })
}

