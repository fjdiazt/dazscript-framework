
import { showSetupCustomActionsDialog as setup } from '@dsf/helpers/custom-action-installer-helper';

setup([
    {
        "name": null,
        "text": "Hello World",
        "filePath": "samples/hello-world.dsa",
        "menuPath": "/DazScriptFramework/samples",
        "description": "hello-world"
    },
    {
        "name": null,
        "text": "Sample Dialog",
        "filePath": "samples/sample-dialog.dsa",
        "menuPath": "/DazScriptFramework/samples",
        "description": "sample-dialog"
    }
], "DazScriptFramework/samples/Installer");
