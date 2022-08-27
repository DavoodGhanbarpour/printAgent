const { app, BrowserWindow,ipcMain,BrowserView } = require('electron');
const path        = require('path')
const fs          = require("fs");
const axios       = require('axios');
const CONFIG_PATH = './config/agentConfig.json';
var win,view;        

const createWindow = () => {
  
  win         = new BrowserWindow({
    autoHideMenuBar: true,
    width: 400,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadFile('./src/index.html');
  win.webContents.send('getConfig', getConfig())
  win.webContents.openDevTools()
};

app.whenReady().then(() => {
  createWindow();
  
  ipcMain.on('setConfig', saveConfigs);
  buildHiddenView();

  setInterval(() => {
    getNextPrintJob();
  },2000);

  
  app.on('activate', function () { if (BrowserWindow.getAllWindows().length === 0) createWindow() });
})



app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

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
    axios.get(`${configs.ip}:${configs.port}/system/prints/${configs.printerName}`)
    .then(function (response) {
      if( response.data != '-' )
      {
        preview(response.data+'?&hide=true')
        print(response.data+'?&hide=true')
      }
    })
    .catch(function (error) {
      console.log(error);
    })
    .then(function () {
    });  
  }
}

function preview(url){
  win.webContents.send('updatePreviewFrame', url)
}

function print(url){
  let configs = getConfig();
  if( configs.printerName )
  {
    view.webContents.loadURL(url)
    view.webContents.print({
      silent: true, 
      printBackground: true, 
      deviceName: printerName
    })

  }
}

function buildHiddenView(){
  view = new BrowserView()
  win.setBrowserView(view)
  view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
}

