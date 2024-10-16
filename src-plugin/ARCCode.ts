import * as vscode from 'vscode';
import * as path from 'path';

export class ARCProvider implements vscode.CustomTextEditorProvider {

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new ARCProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(ARCProvider.viewType, provider);
    return providerRegistration;
  }

  private static readonly viewType = 'arc-code.window';

  constructor(
    private readonly context: vscode.ExtensionContext
  ) { }

  /**
   * Called when our custom editor is opened.
   *
   *
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {

    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    function updateWebview() {
      webviewPanel.webview.postMessage({
        type: 'update',
        text: document.getText(),
      });
    }

    // Hook up event handlers so that we can synchronize the webview with the text document.
    //
    // The text document acts as our model, so we have to sync change in the document to our
    // editor and sync changes in the editor back to the document.
    //
    // Remember that a single text document can also be shared between multiple custom
    // editors (this happens for example when you split a custom editor)

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString()) {
        updateWebview();
      }
    });

    // Make sure we get rid of the listener when our editor is closed.
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    // Receive message from the webview.
    webviewPanel.webview.onDidReceiveMessage(e => {
      switch (e.type) {
        case 'add':
          return;

        case 'delete':
          return;
      }
    });

    updateWebview();
  }

  /**
   * Get the static html used for the editor webviews.
   */
  private getHtmlForWebview(webview: vscode.Webview): string {

    const scriptUri0 = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, 'dist/js/', 'app.js')  // Path to your Vue app's bundled JS file
      )
    );
    const scriptUri1 = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, 'dist/js/', 'chunk-vendors.js')  // Path to your Vue app's bundled JS file
      )
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, 'dist/css/', 'app.css')  // Path to your Vue app's bundled CSS file
      )
    );

    return /* html */`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">

        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">

        <title>ARC Editor</title>
      </head>
      <body>
        <div id="app"></div>
        <script defer="defer" src="${scriptUri0}"></script>
        <script defer="defer" src="${scriptUri1}"></script>
      </body>
      </html>`;
  }
}
