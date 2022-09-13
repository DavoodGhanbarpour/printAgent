const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { dialog }  = require('electron');
const path        = require('path')
const Store       = require('electron-store');
const AutoLaunch  = require('auto-launch');
const axios       = require('axios');
const store       = new Store();
var win, hiddenWin, configs;        

app.disableHardwareAcceleration();

app.whenReady().then(() => {
  createAgentWindow();
  buildHiddenView();
  configs = getConfig();
  ipcMain.on('setConfig', saveConfigs);
  ipcMain.on('getConfig',()=>{
    win.webContents.send('replyGetConfig', getConfig());
  });
  

  setInterval(() => {
    getNextPrintJob();
  },5000);

  
  app.on('activate', function () { 
    if (BrowserWindow.getAllWindows().length === 0) 
      createAgentWindow();
  });

  win.on('minimize',function(event){
    event.preventDefault();
    win.minimize();
  });

  win.on('close', function () {
    app.quit();
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
    win = new BrowserWindow({
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
  configs = getConfig();
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
  let url     = `${configs.ip}:${configs.port}`;
  if( configs.ip && configs.port && configs.printerName && configs.start == 'on' )
  {
    configs.printerName.split(',').forEach(eachPrinterName => {
      setTimeout(() => {
        getAndPrintNextJob( url, eachPrinterName.toString().trim());
      }, 5000);
    });
   
  }
}


function getAndPrintNextJob( url, printerName )
{
  if( printerName == undefined || printerName.length == 0 ) return;
  if( url == undefined || url.length == 0 ) return;

  axios.get(`${url}/system/prints/${printerName}`)
  .then(function (response) {
    if( response.data != '-' )
    {
      preview(response.data+'&hide=true')
      print(response.data+'&hide=true', printerName)
    }
  })
  .catch(function (error) {
  });
}

function preview(url){
  win.webContents.send('updatePreviewFrame', url)
}

function print(url, printerName){
  if( printerName )
  {
    hiddenWin.loadURL(url);
    hiddenWin.webContents.on('did-finish-load', function() {
    hiddenWin.webContents.print({
        silent: true,
        deviceName: printerName,
        printBackground: configs == 'on' ? true : false,
      });
    });
      
  }
}

function buildHiddenView(){
  hiddenWin = new BrowserWindow({ width: 302, height: 793, show: false });
}

