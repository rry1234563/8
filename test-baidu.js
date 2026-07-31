/**
 * 百度文心一言连接测试脚本
 */
const aiService = require('./services/ai-service');

async function testBaidu() {
  console.log('🔍 正在测试百度文心一言连接...\n');
  
  try {
    const info = aiService.getServiceInfo();
    console.log('当前服务配置:', JSON.stringify(info, null, 2));
    
    console.log('\n📡 正在测试连接...');
    const result = await aiService.testConnection();
    
    console.log('\n测试结果:');
    console.log('  成功:', result.success);
    console.log('  消息:', result.message);
    if (result.response) {
      console.log('  回复:', result.response.substring(0, 100) + '...');
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testBaidu();
