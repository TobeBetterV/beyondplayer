import React from 'react';
import cln from 'classnames';
import { remote } from 'electron';
import intersection from 'lodash/intersection';
import { Input, Select, Card, Tooltip, Row, Col, Button } from 'antd';
import vidLib from '../../Model/VidLib';
import { AnkiVideoCard } from './AnkiVideoCard.jsx';
import { hasError, cardsContainer, selectorLink } from './ExportAnkiVidLib.module.less';
import { VidLibExportSourceAdapter } from '../../Model/Export/sources/VidLibExportSourceAdapter';

const i18n = remote.require('./i18n');

const ALLOWED_FIELDS = VidLibExportSourceAdapter.getOutputFields().join(', ');
const templates = [
    {
        title: i18n.t('anki.export.vidlib.onlyOneSubtile'),
        key: 'only_one_subtile',
        front: '[sound:{{frontVideo}}]',
        back: '{{frontText}}'
    },
    {
        title: i18n.t('anki.export.vidlib.bothSubtitles'),
        key: 'both_subtitles',
        front: '{{frontText}} [sound:{{frontVideo}}]',
        back: '{{backText}}'
    }
];

/* eslint-disable react/prefer-stateless-function */
class ExportAnkiVidLib extends React.Component {
    constructor(props) {
        super(props);
        const template = templates[0];
        const videos = [...new VidLibExportSourceAdapter({ vidLib })];

        this.state = {
            videos,
            fieldsErrors: {},
            allTags: vidLib.getAllTags(),
            selectedVideos: new Set(videos.map(({ id }) => id)),
            fields: { deckName: 'Beyond Clip Library Deck', tagsFilter: [], frontTemplate: template.front, backTemplate: template.back }
        };

        this.onDeckNameChange = this.onFieldChange.bind(this, 'deckName', true);
        this.onTagsChange = this.onFieldChange.bind(this, 'tagsFilter', false);
        this.onFrontTemplateChange = this.onFieldChange.bind(this, 'frontTemplate', true);
        this.onBackTemplateChange = this.onFieldChange.bind(this, 'backTemplate', true);
    }

    render() {
        const { allTags = [], fields, fieldsErrors } = this.state;

        const tagOptions = allTags.map(tag => (
            <Select.Option key={tag} value={tag}>
                {tag}
            </Select.Option>
        ));

        const templateOptions = templates.map(({ title, key }) => (
            <Select.Option value={key} key={key}>
                {title}
            </Select.Option>
        ));

        const videoCards = Array.from(this.getFilteredVideos())
            .map(item => ({ ...item, onSelectVideo: this.onSelectVideo }))
            .map(AnkiVideoCard);

        const allowedFieldsTooltip = `${i18n.t('anki.export.vidlib.allowedFields')}: ${ALLOWED_FIELDS}`;

        return (
            <div className="beyond-form">
                <Row>
                    <Col xs={24} sm={5} className="form-label">
                        {i18n.t('anki.export.vidlib.deckName')} :
                    </Col>
                    <Col xs={24} sm={19} className={cln({ [hasError]: fieldsErrors.deckName })}>
                        <Input value={fields.deckName} onChange={this.onDeckNameChange} />
                    </Col>
                </Row>

                <Row>
                    <Col xs={24} sm={5} className="form-label">
                        {i18n.t('anki.export.vidlib.selectTemplate')} :
                    </Col>
                    <Col xs={24} sm={19}>
                        <Select defaultValue={templates[0].title} onChange={this.onChangeTemplate}>
                            {templateOptions}
                        </Select>
                    </Col>
                </Row>

                <Row>
                    <Col xs={24} sm={5} className="form-label">
                        {i18n.t('anki.export.vidlib.frontSide')} :
                    </Col>
                    <Col xs={24} sm={19} className={cln({ [hasError]: fieldsErrors.frontTemplate })}>
                        <Tooltip title={allowedFieldsTooltip} mouseEnterDelay={1}>
                            <Input.TextArea value={fields.frontTemplate} onChange={this.onFrontTemplateChange} />
                        </Tooltip>
                    </Col>
                </Row>

                <Row>
                    <Col xs={24} sm={5} className="form-label">
                        {i18n.t('anki.export.vidlib.backSide')} :
                    </Col>
                    <Col xs={24} sm={19} className={cln({ [hasError]: fieldsErrors.backTemplate })}>
                        <Tooltip title={allowedFieldsTooltip} mouseEnterDelay={1}>
                            <Input.TextArea value={fields.backTemplate} onChange={this.onBackTemplateChange} />
                        </Tooltip>
                    </Col>
                </Row>

                <Row>
                    <Col xs={24} sm={5} className="form-label">
                        {i18n.t('anki.export.vidlib.filterTags')} :
                    </Col>
                    <Col xs={24} sm={19}>
                        <Select mode="multiple" onChange={this.onTagsChange} value={fields.tagsFilter}>
                            {tagOptions}
                        </Select>
                    </Col>
                </Row>

                <Row>
                    <Col xs={24} sm={5} className="form-label">
                        {i18n.t('anki.export.vidlib.videos')} :
                        <br />
                        <Button type="link" className={selectorLink} onClick={() => this.toggleSelectedVideos(true)}>
                            {i18n.t('all')}
                        </Button>
                        <br />
                        <Button type="link" className={selectorLink} onClick={() => this.toggleSelectedVideos(false)}>
                            {i18n.t('none')}
                        </Button>
                    </Col>
                    <Col xs={24} sm={19} className={cln({ [hasError]: fieldsErrors.videos })}>
                        <Card className={cardsContainer}>{videoCards}</Card>
                    </Col>
                </Row>
            </div>
        );
    }

    toggleSelectedVideos = selected => {
        const videos = this.getFilteredVideos();
        const { selectedVideos } = this.state;

        if (selected) {
            videos.forEach(({ id }) => selectedVideos.add(id));
        } else {
            videos.forEach(({ id }) => selectedVideos.delete(id));
        }

        this.setState({ selectedVideos: new Set([...selectedVideos]) });
    };

    onSelectVideo = (id, selected) => {
        const { selectedVideos } = this.state;

        if (selected) {
            selectedVideos.add(id);
        } else {
            selectedVideos.delete(id);
        }

        this.setState({ selectedVideos: new Set([...selectedVideos]) });
    };

    onChangeTemplate = templateKey => {
        const template = templates.find(({ key }) => key === templateKey);

        this.setState(({ fields }) => ({
            fieldsErrors: {},
            fields: {
                ...fields,
                frontTemplate: template.front,
                backTemplate: template.back
            }
        }));
    };

    onFieldChange(fieldName, proxy, value) {
        const resultValue = proxy ? value.currentTarget.value : value;

        this.setState(({ fields }) => ({
            fieldsErrors: {},
            fields: {
                ...fields,
                [fieldName]: resultValue
            }
        }));
    }

    getFilteredVideos = () => {
        const { fields, selectedVideos, videos } = this.state;

        const filter = ({ tags }) => {
            return fields.tagsFilter.length === 0 || intersection(tags, fields.tagsFilter).length;
        };

        return videos.filter(filter).map(item => ({ ...item, checked: selectedVideos.has(item.id) }));
    };

    getParams = () => {
        const fieldsErrors = Object.create(null);
        const {
            fields: { deckName, frontTemplate, backTemplate }
        } = this.state;

        const source = this.getFilteredVideos();

        if (!Array.from(source).length) {
            fieldsErrors.videos = true;
        }

        if (!deckName) {
            fieldsErrors.deckName = true;
        }

        if (!frontTemplate && !backTemplate) {
            fieldsErrors.frontTemplate = true;
            fieldsErrors.backTemplate = true;
        }

        if (Object.keys(fieldsErrors).length) {
            this.setState(() => ({
                fieldsErrors
            }));

            return Promise.reject(fieldsErrors);
        }

        return Promise.resolve({ source: this.getFilteredVideos().filter(({ checked }) => checked), deckName, frontTemplate, backTemplate });
    };
}

export { ExportAnkiVidLib };
