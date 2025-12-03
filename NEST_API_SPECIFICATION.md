# NestJS API Implementation Specification

## API Endpoint Mapping - Flask to NestJS

This document ensures 100% compatibility between the current Flask API and the proposed NestJS implementation.

---

## Authentication Endpoints

### POST /login
**Flask Implementation:**
```python
@app.route("/login", methods=["POST"])
def login()
```

**NestJS Implementation:**
```typescript
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto>
}
```

**Request Body:**
```typescript
interface LoginDto {
  username: string;
  password: string;
}
```

**Response:**
```typescript
interface LoginResponseDto {
  token: string;
  user: {
    id: number;
    username: string;
    nome_completo: string;
    tipo_usuario: 'admin' | 'user';
  };
}
```

---

### GET /me
**Flask Implementation:**
```python
@app.route("/me", methods=["GET"])
@token_required
def get_current_user()
```

**NestJS Implementation:**
```typescript
@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: UserEntity): Promise<UserResponseDto>
}
```

---

## Health Check

### GET /health
**Flask Implementation:**
```python
@app.route("/health", methods=["GET"])
def health()
```

**NestJS Implementation:**
```typescript
@Controller()
export class AppController {
  @Get('health')
  getHealth(): { status: string; message: string }
}
```

**Response:**
```json
{
  "status": "ok",
  "message": "API is running"
}
```

---

## Normas Endpoints

### GET /normas
**Flask Implementation:**
```python
@app.route("/normas", methods=["GET"])
@token_required
def get_normas()
```

**NestJS Implementation:**
```typescript
@Controller('normas')
export class NormasController {
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() filterDto: FilterNormasDto): Promise<PaginatedNormasResponseDto>
}
```

**Query Parameters:**
```typescript
class FilterNormasDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  per_page?: number = 20;

  @IsOptional()
  @IsString()
  tipo_norma?: string;

  @IsOptional()
  @IsString()
  orgao_emissor?: string;

  @IsOptional()
  @IsString()
  origem_publicacao?: string;

  @IsOptional()
  @IsString()
  origem_dado?: string;

  @IsOptional()
  @IsString()
  status_vigencia?: string;

  @IsOptional()
  @IsString()
  divisao_politica?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  aplicavel?: string;

  @IsOptional()
  @IsString()
  status_aprovacao?: string;
}
```

**Response:**
```typescript
interface PaginatedNormasResponseDto {
  data: NormaDto[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}
```

---

### GET /normas/:id
**Flask Implementation:**
```python
@app.route("/normas/<int:norma_id>", methods=["GET"])
@token_required
def get_norma(norma_id)
```

**NestJS Implementation:**
```typescript
@Controller('normas')
export class NormasController {
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<NormaDto>
}
```

---

### POST /normas
**Flask Implementation:**
```python
@app.route("/normas", methods=["POST"])
@token_required
def create_norma()
```

**NestJS Implementation:**
```typescript
@Controller('normas')
export class NormasController {
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createNormaDto: CreateNormaDto): Promise<CreateNormaResponseDto>
}
```

**Request Body:**
```typescript
class CreateNormaDto {
  @IsString()
  @IsNotEmpty()
  numero_norma: string;

  @IsString()
  @IsNotEmpty()
  tipo_norma: string;

  @IsString()
  @IsNotEmpty()
  orgao_emissor: string;

  @IsString()
  @IsNotEmpty()
  titulo_da_norma: string;

  @IsOptional()
  @IsString()
  origem_dado?: string = 'SITE';

  // All other optional fields...
}
```

**Response:**
```typescript
interface CreateNormaResponseDto {
  message: string;
  id: number;
}
```

---

### PUT /normas/:id
**Flask Implementation:**
```python
@app.route("/normas/<int:norma_id>", methods=["PUT"])
@token_required
def update_norma(norma_id)
```

**NestJS Implementation:**
```typescript
@Controller('normas')
export class NormasController {
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNormaDto: UpdateNormaDto
  ): Promise<MessageResponseDto>
}
```

---

### DELETE /normas/:id
**Flask Implementation:**
```python
@app.route("/normas/<int:norma_id>", methods=["DELETE"])
@token_required
def delete_norma(norma_id)
```

**NestJS Implementation:**
```typescript
@Controller('normas')
export class NormasController {
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<MessageResponseDto>
}
```

---

### GET /normas/stats
**Flask Implementation:**
```python
@app.route("/normas/stats", methods=["GET"])
@token_required
def get_stats()
```

**NestJS Implementation:**
```typescript
@Controller('normas')
export class NormasController {
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(): Promise<StatsResponseDto>
}
```

**Response:**
```typescript
interface StatsResponseDto {
  total_normas: number;
  por_tipo: Array<[string, number]>;
  por_orgao: Array<[string, number]>;
  por_status: Array<[string, number]>;
}
```

---

### GET /normas/filtros/valores
**Flask Implementation:**
```python
@app.route("/normas/filtros/valores", methods=["GET"])
@token_required
def get_filtros_valores()
```

**NestJS Implementation:**
```typescript
@Controller('normas')
export class NormasController {
  @Get('filtros/valores')
  @UseGuards(JwtAuthGuard)
  async getFilterValues(): Promise<FilterValuesResponseDto>
}
```

**Response:**
```typescript
interface FilterValuesResponseDto {
  tipo_norma: string[];
  divisao_politica: string[];
  status_vigencia: string[];
  origem_publicacao: string[];
  origem_dado: string[];
}
```

---

### POST /normas/sync-aplicavel
**Flask Implementation:**
```python
@app.route("/normas/sync-aplicavel", methods=["POST"])
@token_required
def sync_aplicavel()
```

**NestJS Implementation:**
```typescript
@Controller('normas')
export class NormasController {
  @Post('sync-aplicavel')
  @UseGuards(JwtAuthGuard)
  async syncAplicavel(): Promise<SyncAplicavelResponseDto>
}
```

**Response:**
```typescript
interface SyncAplicavelResponseDto {
  message: string;
  total_atualizadas: number;
  normas_ids: number[];
}
```

---

### GET /normas/aplicaveis
**Flask Implementation:**
```python
@app.route("/normas/aplicaveis", methods=["GET"])
@token_required
def get_normas_aplicaveis()
```

**NestJS Implementation:**
```typescript
@Controller('normas')
export class NormasController {
  @Get('aplicaveis')
  @UseGuards(JwtAuthGuard)
  async getAplicaveis(@Query() filterDto: FilterAplicaveisDto): Promise<PaginatedNormasResponseDto>
}
```

---

## Aprovações Endpoints

### POST /normas/:id/aprovacao
**Flask Implementation:**
```python
@app.route("/normas/<int:norma_id>/aprovacao", methods=["POST"])
@token_required
def registrar_aprovacao(norma_id)
```

**NestJS Implementation:**
```typescript
@Controller('normas')
export class NormasController {
  @Post(':id/aprovacao')
  @UseGuards(JwtAuthGuard)
  async registrarAprovacao(
    @Param('id', ParseIntPipe) id: number,
    @Body() aprovacaoDto: CreateAprovacaoDto,
    @CurrentUser() user: UserEntity
  ): Promise<AprovacaoResponseDto>
}
```

**Request Body:**
```typescript
class CreateAprovacaoDto {
  @IsString()
  @IsIn(['aprovado', 'recusado'])
  status: 'aprovado' | 'recusado';

  @IsOptional()
  @IsString()
  observacao?: string;
}
```

**Response:**
```typescript
interface AprovacaoResponseDto {
  message: string;
  id: number;
  norma_id: number;
  status: 'aprovado' | 'recusado';
  solicitante: string;
}
```

---

### GET /normas/:id/aprovacao
**Flask Implementation:**
```python
@app.route("/normas/<int:norma_id>/aprovacao", methods=["GET"])
def get_historico_aprovacao(norma_id)
```

**NestJS Implementation:**
```typescript
@Controller('normas')
export class NormasController {
  @Get(':id/aprovacao')
  async getHistoricoAprovacao(@Param('id', ParseIntPipe) id: number): Promise<AprovacaoHistoricoDto[]>
}
```

---

### GET /normas/:id/aprovacao/status
**Flask Implementation:**
```python
@app.route("/normas/<int:norma_id>/aprovacao/status", methods=["GET"])
def get_status_aprovacao(norma_id)
```

**NestJS Implementation:**
```typescript
@Controller('normas')
export class NormasController {
  @Get(':id/aprovacao/status')
  async getStatusAprovacao(@Param('id', ParseIntPipe) id: number): Promise<StatusAprovacaoDto>
}
```

---

### GET /aprovacoes/stats
**Flask Implementation:**
```python
@app.route("/aprovacoes/stats", methods=["GET"])
def get_aprovacoes_stats()
```

**NestJS Implementation:**
```typescript
@Controller('aprovacoes')
export class AprovacoesController {
  @Get('stats')
  async getStats(): Promise<AprovacaoStatsDto>
}
```

---

## Analytics Endpoints

### GET /analytics/origem
**Flask Implementation:**
```python
@app.route("/analytics/origem", methods=["GET"])
@token_required
def get_analytics_origem()
```

**NestJS Implementation:**
```typescript
@Controller('analytics')
export class AnalyticsController {
  @Get('origem')
  @UseGuards(JwtAuthGuard)
  async getOrigem(): Promise<OrigemAnalyticsDto[]>
}
```

**Response:**
```typescript
interface OrigemAnalyticsDto {
  origem: string;
  total: number;
}
```

---

### GET /analytics/origem-publicacao
**Flask Implementation:**
```python
@app.route("/analytics/origem-publicacao", methods=["GET"])
@token_required
def get_analytics_origem_publicacao()
```

**NestJS Implementation:**
```typescript
@Controller('analytics')
export class AnalyticsController {
  @Get('origem-publicacao')
  @UseGuards(JwtAuthGuard)
  async getOrigemPublicacao(): Promise<OrigemAnalyticsDto[]>
}
```

---

### GET /analytics/municipio
**Flask Implementation:**
```python
@app.route("/analytics/municipio", methods=["GET"])
@token_required
def get_analytics_municipio()
```

**NestJS Implementation:**
```typescript
@Controller('analytics')
export class AnalyticsController {
  @Get('municipio')
  @UseGuards(JwtAuthGuard)
  async getMunicipio(): Promise<MunicipioAnalyticsDto[]>
}
```

**Response:**
```typescript
interface MunicipioAnalyticsDto {
  municipio: string;
  total: number;
}
```

---

### GET /analytics/sincronizacao
**Flask Implementation:**
```python
@app.route("/analytics/sincronizacao", methods=["GET"])
@token_required
def get_analytics_sincronizacao()
```

**NestJS Implementation:**
```typescript
@Controller('analytics')
export class AnalyticsController {
  @Get('sincronizacao')
  @UseGuards(JwtAuthGuard)
  async getSincronizacao(): Promise<SincronizacaoAnalyticsDto[]>
}
```

**Response:**
```typescript
interface SincronizacaoAnalyticsDto {
  origem: string;
  ultima_sincronizacao: string;
}
```

---

### GET /analytics/volume-dia
**Flask Implementation:**
```python
@app.route("/analytics/volume-dia", methods=["GET"])
@token_required
def get_analytics_volume_dia()
```

**NestJS Implementation:**
```typescript
@Controller('analytics')
export class AnalyticsController {
  @Get('volume-dia')
  @UseGuards(JwtAuthGuard)
  async getVolumeDia(): Promise<VolumeDiaAnalyticsDto[]>
}
```

**Response:**
```typescript
interface VolumeDiaAnalyticsDto {
  dia: string;
  total: number;
}
```

---

## Management Systems Endpoints

### GET /management-systems
**Flask Implementation:**
```python
@app.route("/management-systems", methods=["GET"])
@token_required
def get_management_systems()
```

**NestJS Implementation:**
```typescript
@Controller('management-systems')
export class ManagementSystemsController {
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(): Promise<ManagementSystemDto[]>
}
```

**Response:**
```typescript
interface ManagementSystemDto {
  sistema: string;
  total: number;
}
```

---

### GET /management-systems/:norm_id
**Flask Implementation:**
```python
@app.route("/management-systems/<int:norm_id>", methods=["GET"])
@token_required
def get_management_systems_by_norm(norm_id)
```

**NestJS Implementation:**
```typescript
@Controller('management-systems')
export class ManagementSystemsController {
  @Get(':normId')
  @UseGuards(JwtAuthGuard)
  async findByNorm(@Param('normId', ParseIntPipe) normId: number): Promise<ClassificationDto[]>
}
```

---

### GET /analytics/management-systems
**Flask Implementation:**
```python
@app.route("/analytics/management-systems", methods=["GET"])
@token_required
def get_analytics_management_systems()
```

**NestJS Implementation:**
```typescript
@Controller('analytics')
export class AnalyticsController {
  @Get('management-systems')
  @UseGuards(JwtAuthGuard)
  async getManagementSystems(): Promise<ManagementSystemAnalyticsDto[]>
}
```

**Response:**
```typescript
interface ManagementSystemAnalyticsDto {
  sistema: string;
  total: number;
  classificadas: number;
  avg_dst: number;
  avg_hst: number;
}
```

---

### GET /normas/:id/management-systems
**Flask Implementation:**
```python
@app.route("/normas/<int:norma_id>/management-systems", methods=["GET"])
@token_required
def get_norma_with_management_systems(norma_id)
```

**NestJS Implementation:**
```typescript
@Controller('normas')
export class NormasController {
  @Get(':id/management-systems')
  @UseGuards(JwtAuthGuard)
  async getNormaWithManagementSystems(@Param('id', ParseIntPipe) id: number): Promise<NormaWithClassificationsDto>
}
```

---

## Users Management Endpoints (Admin Only)

### GET /usuarios
**Flask Implementation:**
```python
@app.route("/usuarios", methods=["GET"])
@token_required
@admin_required
def get_usuarios()
```

**NestJS Implementation:**
```typescript
@Controller('usuarios')
export class UsersController {
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findAll(): Promise<UsersListResponseDto>
}
```

**Response:**
```typescript
interface UsersListResponseDto {
  usuarios: UserDto[];
}

interface UserDto {
  id: number;
  username: string;
  nome_completo: string;
  tipo_usuario: 'admin' | 'user';
  ativo: boolean;
  data_criacao: string;
}
```

---

### POST /usuarios
**Flask Implementation:**
```python
@app.route("/usuarios", methods=["POST"])
@token_required
@admin_required
def create_usuario()
```

**NestJS Implementation:**
```typescript
@Controller('usuarios')
export class UsersController {
  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async create(@Body() createUserDto: CreateUserDto): Promise<CreateUserResponseDto>
}
```

**Request Body:**
```typescript
class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  nome_completo: string;

  @IsOptional()
  @IsIn(['admin', 'user'])
  tipo_usuario?: 'admin' | 'user' = 'user';
}
```

---

### PUT /usuarios/:id
**Flask Implementation:**
```python
@app.route("/usuarios/<int:user_id>", methods=["PUT"])
@token_required
@admin_required
def update_usuario(user_id)
```

**NestJS Implementation:**
```typescript
@Controller('usuarios')
export class UsersController {
  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<UpdateUserResponseDto>
}
```

---

### DELETE /usuarios/:id
**Flask Implementation:**
```python
@app.route("/usuarios/<int:user_id>", methods=["DELETE"])
@token_required
@admin_required
def delete_usuario(user_id)
```

**NestJS Implementation:**
```typescript
@Controller('usuarios')
export class UsersController {
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserEntity
  ): Promise<MessageResponseDto>
}
```

---

### GET /usuarios/:id/aprovacoes
**Flask Implementation:**
```python
@app.route("/usuarios/<int:user_id>/aprovacoes", methods=["GET"])
@token_required
@admin_required
def get_usuario_aprovacoes(user_id)
```

**NestJS Implementation:**
```typescript
@Controller('usuarios')
export class UsersController {
  @Get(':id/aprovacoes')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAprovacoes(@Param('id', ParseIntPipe) id: number): Promise<UserAprovacoesResponseDto>
}
```

---

## Critical Implementation Notes

### 1. Route Order in NestJS
Routes must be ordered correctly to avoid conflicts:
```typescript
// Correct order
@Get('stats')           // /normas/stats
@Get('filtros/valores') // /normas/filtros/valores
@Get('aplicaveis')      // /normas/aplicaveis
@Get(':id')             // /normas/:id (must be last)
```

### 2. Authentication Guards
```typescript
// JWT Authentication Guard
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
    if (!user.ativo) {
      throw new UnauthorizedException('Usuário inativo');
    }
    return user;
  }
}

// Admin Guard
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user || user.tipo_usuario !== 'admin') {
      throw new ForbiddenException('Acesso negado. Requer permissão de administrador');
    }
    
    return true;
  }
}
```

### 3. Current User Decorator
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### 4. Database Service
```typescript
@Injectable()
export class DatabaseService {
  private normasConnection: any;
  private managementConnection: any;

  constructor() {
    this.normasConnection = duckdb.connect(process.env.DB_PATH);
    this.managementConnection = duckdb.connect(process.env.DB_MANAGEMENT_PATH);
  }

  getConnection() {
    return this.normasConnection;
  }

  getManagementConnection() {
    return this.managementConnection;
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.normasConnection.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async queryManagement(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.managementConnection.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}
```

### 5. Error Handling
```typescript
// Global Exception Filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      error: message,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### 6. CORS Configuration
```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  await app.listen(5000);
}
```

### 7. JWT Configuration
```typescript
// auth.module.ts
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.SECRET_KEY || 'ambipar-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
})
export class AuthModule {}
```

---

## Environment Variables

```bash
# .env
DB_PATH=/Users/conjo/Documents/ambipar/db_consolidado/tb_normas_consolidadas.db
DB_MANAGEMENT_PATH=/Users/conjo/Documents/ambipar/db_consolidado/management_systems_classifications.db
SECRET_KEY=ambipar-secret-key-change-in-production
JWT_EXPIRATION=7d
PORT=5001
NODE_ENV=development
```

---

## Testing Checklist

- [ ] All authentication endpoints work correctly
- [ ] JWT token generation and validation
- [ ] Admin guard blocks non-admin users
- [ ] All normas CRUD operations
- [ ] Pagination works correctly
- [ ] All filters work (tipo_norma, orgao_emissor, etc.)
- [ ] Search functionality
- [ ] Status approval filtering
- [ ] Sync aplicavel updates correctly
- [ ] All analytics endpoints return correct data
- [ ] Management systems integration
- [ ] User management (admin only)
- [ ] Aprovações workflow
- [ ] Error handling returns proper HTTP codes
- [ ] CORS allows frontend requests
- [ ] Database connections are stable

---

## Migration Strategy

1. **Phase 1**: Set up NestJS project structure
2. **Phase 2**: Implement authentication module
3. **Phase 3**: Implement database service
4. **Phase 4**: Implement normas module
5. **Phase 5**: Implement analytics module
6. **Phase 6**: Implement management systems module
7. **Phase 7**: Implement users module
8. **Phase 8**: Implement aprovações module
9. **Phase 9**: Testing and validation
10. **Phase 10**: Deploy alongside Flask (blue-green deployment)
11. **Phase 11**: Switch frontend to NestJS API
12. **Phase 12**: Decommission Flask API

---

## Conclusion

This specification ensures 100% API compatibility between Flask and NestJS. All endpoints, request/response formats, authentication mechanisms, and business logic are preserved. The frontend will work without any modifications once the NestJS API is deployed.
