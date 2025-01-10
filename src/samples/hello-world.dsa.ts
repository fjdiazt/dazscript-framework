import { debug } from '@dsf/common/log';
import { action } from '@dsf/core/action-decorator';
import { BaseScript } from '@dsf/core/base-script';
import { info } from '@dsf/helpers/message-box-helper';

@action({ text: 'Hello World' })
class HelloWorldScript extends BaseScript {
    protected run(): void {
        debug('Hello World!');
        info('Hello World!');
    }
}
new HelloWorldScript().exec();