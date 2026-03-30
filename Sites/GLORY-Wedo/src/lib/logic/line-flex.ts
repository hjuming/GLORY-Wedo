import { DetailedCost } from './itinerary-costs';
import { AIAdvice } from './ai-advisor';

/**
 * 產生御之旅 LINE Flex Message 報價單
 * @param cost 報價數據
 * @param advice AI 顧問診斷
 * @param title 團名或行程標題
 */
export function generateQuoteFlex(cost: DetailedCost, advice: AIAdvice, title: string) {
  const statusColors = {
    healthy: '#16a34a',
    warning: '#ea580c',
    alert: '#ef4444'
  };

  const mainColor = statusColors[advice.status];

  return {
    type: 'flex',
    altText: `御之旅報價單: ${title}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: mainColor,
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: 'M.T TOURS 專業報價單',
            weight: 'bold',
            color: '#ffffff',
            size: 'sm'
          },
          {
            type: 'text',
            text: title,
            weight: 'bold',
            size: 'xl',
            color: '#ffffff',
            margin: 'md'
          },
          {
            type: 'text',
            text: advice.status === 'healthy' ? '✅ 報價結構健康' :
                  advice.status === 'warning' ? '⚠️ 結構異常提醒' : '🚨 利潤警示',
            size: 'xs',
            color: '#ffffff',
            margin: 'md'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '台幣應收人均',
                    size: 'sm',
                    color: '#555555',
                    flex: 0
                  },
                  {
                    type: 'text',
                    text: `NT$ ${cost.finalQuoteTwd.toLocaleString()}`,
                    size: 'xl',
                    align: 'end',
                    weight: 'bold',
                    color: '#000000'
                  }
                ]
              },
              {
                type: 'text',
                text: `(日幣成本: ¥${cost.subtotalJpy.toLocaleString()})`,
                size: 'xs',
                color: '#aaaaaa',
                align: 'end'
              },
              {
                type: 'separator',
                margin: 'md'
              }
            ]
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'xs',
            contents: [
              renderCostRow('🚗 交通交通 (含司機)', cost.transportJpy, getRatio(cost.transportJpy, cost.subtotalJpy)),
              renderCostRow('🏨 住宿分攤', cost.hotelJpy, getRatio(cost.hotelJpy, cost.subtotalJpy)),
              renderCostRow('⛳ 球場安排', cost.golfJpy, getRatio(cost.golfJpy, cost.subtotalJpy)),
              renderCostRow('🍽️ 餐飲服務', cost.diningJpy, getRatio(cost.diningJpy, cost.subtotalJpy)),
              renderCostRow('🙋 導遊津貼', cost.staffJpy, getRatio(cost.staffJpy, cost.subtotalJpy))
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: '🤖 AI 顧問診斷與建議',
            size: 'sm',
            color: '#888888',
            weight: 'bold'
          },
          ...advice.suggestions.map(s => ({
            type: 'text',
            text: `• ${s}`,
            size: 'xs',
            color: '#666666',
            wrap: true
          })),
          {
            type: 'separator',
            margin: 'md'
          },
          {
            type: 'text',
            text: `⛳ 球場佔比 ${getRatio(cost.golfJpy, cost.subtotalJpy)} ｜🏨 住宿佔比 ${getRatio(cost.hotelJpy, cost.subtotalJpy)} ｜🚗 交通佔比 ${getRatio(cost.transportJpy, cost.subtotalJpy)}`,
            size: 'xxs',
            color: '#aaaaaa',
            wrap: true,
            margin: 'md'
          },
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '查看完整行程',
              uri: 'https://wedopr.com'
            },
            color: '#1e3a5f',
            margin: 'md'
          }
        ]
      },
      styles: {
        footer: {
          separator: true
        }
      }
    }
  };
}

function renderCostRow(label: string, value: number, ratio: string) {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'text',
        text: label,
        size: 'xs',
        color: '#888888',
        flex: 3
      },
      {
        type: 'text',
        text: ratio,
        size: 'xxs',
        color: '#cccccc',
        flex: 1,
        align: 'end'
      },
      {
        type: 'text',
        text: `¥${value.toLocaleString()}`,
        size: 'xs',
        color: '#444444',
        align: 'end',
        flex: 2,
        weight: 'bold'
      }
    ]
  };
}

function getRatio(val: number, total: number): string {
  return `${Math.round((val / total) * 100)}%`;
}
