import React from 'react';
import { remote } from 'electron';
import { Button, Tabs, Modal, Spin, notification } from 'antd';
import { ExportAnkiVidLib } from './ExportAnkiVidLib.jsx';
import { AnkiFileDestination } from '../../Model/Export/destinations/anki';

const i18n = remote.require('./i18n');

export class ExportAnkiDialog extends React.Component {
    constructor(props) {
        super(props);
        this.activeTab = 'ankiVidLib';
        this.state = { exporting: false };
    }

    render() {
        const { onClose } = this.props;
        const { exporting } = this.state;

        return (
            <Modal
                visible
                centered
                maskClosable={false}
                width={700}
                title={i18n.t('anki.export.dialog.tittle')}
                className="anki-export-modal"
                onCancel={onClose}
                footer={[
                    <Button size="large" key="close" onClick={onClose} disabled={exporting}>
                        {i18n.t('close')}
                    </Button>,
                    <Button type="primary" size="large" key="export" onClick={this.onExport} disabled={exporting}>
                        {i18n.t('export')}
                    </Button>
                ]}>
                <Spin spinning={exporting} tip={`${i18n.t('exporting')}...`}>
                    <div style={{ height: 560 }}>
                        <Tabs defaultActiveKey="1" onChange={activeTab => (this.currentSource = activeTab)}>
                            <Tabs.TabPane tab={i18n.t('clip.library')} key="ankiVidLib">
                                <div style={{ padding: 10 }}>
                                    <ExportAnkiVidLib ref={e => (this.ankiVidLib = e)} />
                                </div>
                            </Tabs.TabPane>
                        </Tabs>
                    </div>
                </Spin>
            </Modal>
        );
    }

    onExport = () => {
        this[this.activeTab].getParams().then(async params => {
            const { deckName, source, frontTemplate, backTemplate } = params;
            const defaultPath = `${deckName.replace(/\s/g, '').toLowerCase()}.anki.apkg`;
            const file = remote.dialog.showSaveDialog(remote.getCurrentWindow(), { defaultPath });

            if (file) {
                this.setState(() => ({ exporting: true }));

                new AnkiFileDestination({ deckName, file, frontTemplate, backTemplate })
                    .export(source)
                    .then(() => {
                        notification.success({
                            placement: 'topRight',
                            message: i18n.t('anki.export.dialog.success')
                        });
                    })
                    .catch(() => {
                        notification.error({
                            placement: 'topRight',
                            message: i18n.t('anki.export.dialog.fail')
                        });
                    })
                    .finally(() => {
                        this.setState(() => ({ exporting: false }));
                    });
            }
        });
    };
}
