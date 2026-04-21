import { debug } from '@dsf/common/log';
import { action } from '@dsf/core/action';
import { info } from '@dsf/helpers/message-box-helper';

action({ text: 'Hello World' }, () => {
    debug('Hello World!');
    info('Hello World!');
})
