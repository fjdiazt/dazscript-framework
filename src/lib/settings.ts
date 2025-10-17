import { debug } from '@dsf/common/log';
import { Observable } from './observable';

export class AppSettings {
    private appSettings: DzAppSettings
    private _settingsPath: string
    private _appDataPath: string
    get appDataPath(): string {
        return this._appDataPath
    }

    constructor(settingsPath: string, appDataPath?: string) {
        this._settingsPath = settingsPath
        this.setPaths({ settingsPath: settingsPath, appDataPath: appDataPath ?? settingsPath })
    }

    setPaths(paths: { settingsPath?: string, appDataPath?: string }) {
        if (!paths.settingsPath && !paths.appDataPath) return
        if (paths.settingsPath) {
            debug(`Updating settings path to: ${paths.settingsPath}`)
            this._settingsPath = paths.settingsPath
            this.appSettings = new DzAppSettings(paths.settingsPath)
        }
        if (paths.appDataPath) {
            debug(`Updating app data path to: ${paths.appDataPath}`)
            this._appDataPath = `${App.getAppDataPath()}/${paths.appDataPath}`
        }
    }

    forPath(path: string, ...paths: string[]): DzAppSettings {
        let target = [this._settingsPath, path, ...paths].join('/')
        return new DzAppSettings(target)
    }

    protected getInt(name: keyof this, value: number): number {
        return this.appSettings.getIntValue(String(name), value);
    }

    protected setInt(name: keyof this, value: number) {
        this.appSettings.setIntValue(String(name), value)
    }

    protected getFloat(name: keyof this, value: number): number {
        return this.appSettings.getFloatValue(String(name), value);
    }

    protected setFloat(name: keyof this, value: number) {
        this.appSettings.setFloatValue(String(name), value)
    }

    protected getBool(name: keyof this, defaultValue: boolean): boolean {
        return this.appSettings.getBoolValue(String(name), defaultValue);
    }

    protected setBool(name: keyof this, value: boolean): void {
        this.appSettings.setBoolValue(String(name), value)
    }

    protected getString(name: keyof this, defaultValue: string): string {
        return this.appSettings.getStringValue(String(name), defaultValue)
    }

    protected setString(name: keyof this, value: string): void {
        this.appSettings.setStringValue(String(name), value)
    }

    protected getArray(name: keyof this, defaultValue: string[]): string[] {
        return this.appSettings.getStringValue(String(name), defaultValue.join(',')).split(',')
    }

    // protected setArray(name: keyof this, value: string[]): void {
    //     this.appSettings.setStringValue(String(name), value.join(','))
    // }

    // protected getJson<T>(name: keyof this, defaultValue: T): T {
    //     return JSON.parse(this.getString(name, JSON.stringify(defaultValue)))
    // }

    // protected setJson<T>(name: keyof this, value: T): void {
    //     this.setString(name, JSON.stringify(value))
    // }


    bindBoolean(name: keyof this, defaultValue: boolean = false): Observable<boolean> {
        return new Observable(this.getBool(name, defaultValue), (value) => this.setBool(name, value))
    }

    bindString(name: keyof this, defaultValue: string = ''): Observable<string> {
        return new Observable(this.getString(name, defaultValue), (value) => this.setString(name, value))
    }

    bindInt(name: keyof this, defaultValue: number): Observable<number> {
        return new Observable(this.getInt(name, defaultValue), (value) => this.setInt(name, value))
    }

    bindFloat(name: keyof this, defaultValue: number): Observable<number> {
        return new Observable(this.getFloat(name, defaultValue), (value) => this.setFloat(name, value))
    }

    // bindArray(name: keyof this, defaultValue: string[] = []): Observable<string[]> {
    //     return new Observable(this.getArray(name, defaultValue), (value) => this.setArray(name, value))
    // }

    // bindJson<T>(name: keyof this, defaultValue: T): Observable<T> {
    //     return new Observable(this.getJson(name, defaultValue), (value) => this.setJson(name, value))
    // }
}