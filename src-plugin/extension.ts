import * as vscode from 'vscode';
// import { ARC } from "@nfdi4plants/arctrl";

export function activate(context: vscode.ExtensionContext) {

  context.subscriptions.push(
    vscode.commands.registerCommand('arc-code.start', () => {
      ARCPanel.createOrShow(context.extensionUri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'arc-code.edit_investigation',
      (uri: vscode.Uri)=>ARCPanel.currentPanel?ARCPanel.currentPanel.edit_investigation(uri):null
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'arc-code.edit_study',
      (uri: vscode.Uri)=>ARCPanel.currentPanel?ARCPanel.currentPanel.edit_study(uri):null
    )
  );

  if (vscode.window.registerWebviewPanelSerializer) {
    // Make sure we register a serializer in activation event
    vscode.window.registerWebviewPanelSerializer(ARCPanel.viewType, {
      async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
        console.log(`Got state: ${state}`);
        // Reset the webview options so we use latest uri for `localResourceRoots`.
        webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
        ARCPanel.revive(webviewPanel, context.extensionUri);
      }
    });
  }
}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')]
  };
}

class ARCPanel {
  public static currentPanel: ARCPanel | undefined;

  public static readonly viewType = 'arc-code';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _listeners: Array<(inMessage:any) => void> = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (ARCPanel.currentPanel) {
      ARCPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      ARCPanel.viewType,
      'ARC Code',
      column || vscode.ViewColumn.One,
      getWebviewOptions(extensionUri),
    );

    ARCPanel.currentPanel = new ARCPanel(panel, extensionUri);
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    ARCPanel.currentPanel = new ARCPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      e => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables
    );

    // api listeners
    this._listeners.push(async inMessage=>{
      if(!inMessage.acid || !inMessage.api) return;
      switch(inMessage.api){
        case 'readXLSX':
          const arc_root = vscode.workspace.workspaceFolders?vscode.workspace.workspaceFolders[0].uri.path:'';
          const xlsx_uri = vscode.Uri.file(arc_root+'/'+inMessage.path);
          console.log('reading xlsx',xlsx_uri)
          const xlsx = await vscode.workspace.fs.readFile(xlsx_uri);
          console.log('reading xlsx done',xlsx_uri)
          return this._panel.webview.postMessage({acid:inMessage.acid, xlsx:xlsx});
      }
    });

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      message => {
        if(!message.acid) return;
        for(let i=this._listeners.length-1; i>=0; i--)
          this._listeners[i](message);
      },
      null,
      this._disposables
    );

    this.readARC();
  }

  public postMessage(outMessage: any): any{
    return new Promise((resolve,reject)=>{
      outMessage.acid = 1+Math.random();
      const listener = (inMessage:any)=>{
        if(inMessage.acid !== outMessage.acid) return;
        const index = this._listeners.indexOf(listener);
        this._listeners.splice(index, 1);
        resolve(inMessage);
      };
      this._listeners.push(listener);
      this._panel.webview.postMessage(outMessage);
    });
  }

  public postMessage2(outMessage: any): any{
      outMessage.acid = 1+Math.random();
      this._panel.webview.postMessage(outMessage);
  }

  public edit_investigation(uri: vscode.Uri){
    this.postMessage2({api:'edit_investigation'});
  }

  public edit_study(uri: vscode.Uri){
    const study = uri.path.split('/').pop();
    this.postMessage2({api:'edit_study', name:study});
  }


  public async readARC() {

    // const result = await this.postMessage({a:1,b:2});

    // console.error('r',result);

    const arc_root = vscode.workspace.workspaceFolders?vscode.workspace.workspaceFolders[0].uri.path:'';
    const xlsx_uris = await vscode.workspace.findFiles('**/*.xlsx');
    console.log(xlsx_uris.map(i=>i.path))
    this.postMessage2({api:'read_ARC',xlsx_paths:xlsx_uris.map(i=>i.path.replace(arc_root+'/',''))});
    // const xlsx_files = [];
    // for(let uri of xlsx_paths){
    //   const content = await vscode.workspace.fs.readFile(uri);
    //   xlsx_files.push(uri.path);
    //   xlsx_files.push(content);
    // }

    // // const arc = ARC.fromFilePaths(xlsx_files.map(i=>i.path));

    // this._panel.webview.postMessage({ ac:true, xlsx_files: xlsx_files });
    // console.log(arc)
    // for(let uri of xlsx_files){
    //   const content = await vscode.workspace.fs.readFile(uri);
    //   console.log(content)
    // }
    // const arc = ARC.fromFilePaths(xlsx_files);
    // const contracts = arc.GetReadContracts();
    // for(const contract of contracts){
    //   const buffer = await window.ipc.invoke('LocalFileSystemService.readFile', [arc_root+'/'+contract.Path,{}]);
    //   contract.DTO = await Xlsx.fromBytes(buffer);
    // }
    // arc.SetISAFromContracts(contracts);
    // ArcControlService.props.arc = arc;
    // ArcControlService.props.arc_root = arc_root;
  }

  public dispose() {
    ARCPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    const webview = this._panel.webview;

    // Vary the webview's content based on where it is located in the editor.
    console.log(this._panel.viewColumn)

    return this.__update(webview);
  }

  private __update(webview: vscode.Webview) {
    this._panel.title = 'ARC Code';
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {

    console.log('getHTML')

    console.log(this._extensionUri)

    const scriptUri0 = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'js', 'app.js')
    );
    const scriptUri1 = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'js', 'chunk-vendors.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'css', 'app.css')
    );

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">

        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">

        <title>ARC Editor</title>
      </head>
      <body>
        <div id="app"></div>
        <script>
          window.vscode = acquireVsCodeApi();
        </script>
        <script defer="defer" src="${scriptUri0}"></script>
        <script defer="defer" src="${scriptUri1}"></script>
      </body>
      </html>`;
  }
}
