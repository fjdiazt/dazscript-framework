import * as log from "@dsf/common/log"

export const info = (msg: string) => {
    MessageBox.information(msg, "", "Ok")
}

export const error = (message: string, writeLog: boolean = true) => {
    if (writeLog) log.debug(message)
    MessageBox.critical(message, "Error", "Ok")
}

export const confirm = (message?: string): { ok: boolean, cancel: boolean } => {
    var response = MessageBox.question(message ?? "Confirm?", "", "Ok", "Cancel");

    return { ok: response == 0, cancel: response != 0 };
}

export const prompt = (text: string, title: string, button0: string, button1?: string): { cancel: boolean, selection: number } => {
    const response = MessageBox.question(text, title, button0, button1, "Cancel")

    return { cancel: response === 0, selection: response };
}