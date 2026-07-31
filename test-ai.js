/**
 * AI 服务测试脚本
 * 
 * 使用方法: node test-ai.js
 * 功能: 测试百度文心一言 API 是否正常工作
 */
const aiService = require('./services/ai-service');

async function test() {
  console.log('='.repeat(60));
  console.log('🤖 AI 服务测试工具');
  console.log('='.repeat(60));
  
  // 1. 查看当前配置
  console.log('\n📋 当前 AI 服务配置:');
  const info = aiService.getServiceInfo();
  console.log('  服务商:', info.service);
  console.log('  模型:', info.model);
  console.log('  API 已配置:', info.apiConfigured ? '✅ 是' : '❌ 否');
  
  if (!info.apiConfigured) {
    console.log('\n❌ 请先在 config/ai-config.js 中配置 API Key');
    process.exit(1);
  }
  
  // 2. 测试连接
  console.log('\n🔍 正在测试连接...');
  console.log('  (这可能需要几秒钟)');
  
  try {
    const result = await aiService.testConnection();
    
    console.log('\n📊 测试结果:');
    console.log('  成功:', result.success ? '✅ 是' : '❌ 否');
    console.log('  消息:', result.message);
    
    if (result.success && result.response) {
      console.log('\n💬 AI 回复预览:');
      console.log('  "' + result.response.substring(0, 150) + '..."');
      console.log('\n✅ 百度文心一言连接成功！');
    } else {
      console.log('\n❌ 连接失败！');
      console.log('\n可能的原因:');
      console.log('  1. API Key 或 Secret Key 格式不正确');
      console.log('  2. 账号未开通文心一言服务');
      console.log('  3. 网络连接问题');
      console.log('\n请检查 config/ai-config.js 中的配置是否正确。');
    }
  } catch (error) {
    console.error('\n❌ 测试异常:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
}

test();
