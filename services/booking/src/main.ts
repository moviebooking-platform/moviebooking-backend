import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import {
  HttpExceptionFilter,
  LoggingInterceptor,
  TransformInterceptor,
  initIdCipher,
} from '@moviebooking/common';

/**
 * Bootstrap the Booking Service application.
 * Configures global pipes, filters, interceptors, CORS, and Swagger documentation.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Initialize ID encryption
  initIdCipher();

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(app.get(Reflector)),
  );

  // Swagger documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
    const config = new DocumentBuilder()
      .setTitle('Booking Service API')
      .setDescription('Seat holds, bookings, and booking state management')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('PORT', 3005);
  await app.listen(port);
  console.log(`Booking Service running on port ${port}`);
}

bootstrap();
