import * as vscode from 'vscode';
import { ARCProvider } from './ARCCode';

export function activate(context: vscode.ExtensionContext) {
	// Register our custom editor providers
	context.subscriptions.push(ARCProvider.register(context));
}
