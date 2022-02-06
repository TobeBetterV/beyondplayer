module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    node: 'current'
                }
            }
        ]
    ],
    env: {
        test: {
            presets: ['@babel/preset-react']
        }
    },
    plugins: [
        [
            'import',
            {
                libraryName: 'antd',
                style: true
            }
        ],
        'dynamic-import-node'
    ]
};
