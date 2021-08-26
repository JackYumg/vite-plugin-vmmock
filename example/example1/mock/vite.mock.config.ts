export default [
    {
        url: '/apis/images', method: 'get', type: 'iamge', option: {
            size: 300,
            background: '#fff',
            text: '我是红色的',
            foreground: '#8878dd',
            format: 'jpg'
        }
    },
    {
        url: '/apis/date', method: 'get', type: 'date', option: {
            min: '2018-10-22 12:12:44', max: '2021-10-22 12:12:44', formate: 'yyyy年MM月dd日 HH时mm分ss秒', unit: 'year', isNow: false
        }
    },
    {
        url: '/apis/number', method: 'get', type: 'number', option: 'range|1-200'
    }
]